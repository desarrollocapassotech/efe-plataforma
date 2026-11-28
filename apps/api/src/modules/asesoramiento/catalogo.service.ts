import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  conNuevoMonto,
  conPlan,
  mesEnCurso,
  puedeAsignarPlan,
  suscripcionActiva,
} from '@efe/shared/asesoramiento';
import { aString2Decimales } from '@efe/shared/dinero';
import type {
  ActualizarBroker,
  ActualizarItemPrecio,
  ActualizarPrecioPlan,
  AsignarPlan,
  BrokerAsesoramiento,
  CrearBroker,
  CrearItemPrecio,
  Fiscal,
  PlanAsesoramiento,
  ResultadoLote,
  ServicioAsesoramiento,
} from '@efe/shared/schemas';
import { Prisma } from '@prisma/client';
import { conflicto, noEncontrado } from '../../common/errors/errores';
import { PrismaService } from '../../prisma/prisma.service';
import { escribirSuscripcion, INCLUIR_CLIENTE, suscripcionDe } from './clientes.service';

const dec = (v: Prisma.Decimal) => aString2Decimales(v.toString());
const json = (v: unknown) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

/** Brokers, planes (suscripción mensual) y servicios (pago único) del asesoramiento. */
@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Brokers -------------------------------------------------------------------------

  async listarBrokers(): Promise<BrokerAsesoramiento[]> {
    const filas = await this.prisma.broker.findMany({
      include: { _count: { select: { clientes: true } } },
      orderBy: { nombre: 'asc' },
    });
    return filas.map((b) => this.aBroker(b, b._count.clientes));
  }

  /** `faktiaReferencia` de los nuevos: "broker:<uuid>" (mismo formato que los migrados). */
  async crearBroker(d: CrearBroker): Promise<BrokerAsesoramiento> {
    await this.nombreBrokerLibre(d.nombre);
    const b = await this.prisma.broker.create({
      data: {
        faktiaReferencia: `broker:${randomUUID()}`,
        nombre: d.nombre,
        email: d.email ?? null,
        telefono: d.telefono ?? null,
        notas: d.notas ?? null,
        ...(d.fiscal !== undefined ? { fiscal: json(d.fiscal) } : {}),
      },
    });
    return this.aBroker(b, 0);
  }

  /** Renombrar no necesita reescribir clientes: la relación es por id. */
  async actualizarBroker(id: string, d: ActualizarBroker): Promise<BrokerAsesoramiento> {
    await this.brokerExistente(id);
    if (d.nombre) await this.nombreBrokerLibre(d.nombre, id);
    const b = await this.prisma.broker.update({
      where: { id },
      data: {
        ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
        ...(d.email !== undefined ? { email: d.email } : {}),
        ...(d.telefono !== undefined ? { telefono: d.telefono } : {}),
        ...(d.notas !== undefined ? { notas: d.notas } : {}),
        ...(d.fiscal !== undefined ? { fiscal: json(d.fiscal) } : {}),
      },
      include: { _count: { select: { clientes: true } } },
    });
    return this.aBroker(b, b._count.clientes);
  }

  /** No se borra si algún cliente lo tiene asignado. */
  async borrarBroker(id: string): Promise<void> {
    await this.brokerExistente(id);
    const clientes = await this.prisma.clienteBroker.count({ where: { brokerId: id } });
    if (clientes > 0) {
      throw conflicto(
        'BROKER_CON_CLIENTES',
        `Lo tienen ${clientes} cliente(s): sacáselo antes de borrarlo`,
      );
    }
    await this.prisma.broker.delete({ where: { id } });
  }

  // --- Planes --------------------------------------------------------------------------

  async listarPlanes(): Promise<PlanAsesoramiento[]> {
    const [planes, suscripciones] = await Promise.all([
      this.prisma.planAsesoramiento.findMany({ orderBy: { nombre: 'asc' } }),
      this.prisma.suscripcionAsesoramiento.findMany({
        where: { planId: { not: null } },
        select: { planId: true, hasta: true },
      }),
    ]);
    const actual = mesEnCurso();
    return planes.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      precio: dec(p.precio),
      clientes: suscripciones.filter(
        (s) =>
          s.planId === p.id &&
          suscripcionActiva({ planId: p.id, desde: '', hasta: s.hasta, historial: [] }, actual),
      ).length,
    }));
  }

  async crearPlan(d: CrearItemPrecio): Promise<PlanAsesoramiento> {
    const p = await this.prisma.planAsesoramiento.create({ data: d });
    return { id: p.id, nombre: p.nombre, precio: dec(p.precio), clientes: 0 };
  }

  /** Solo nombre o precio del plan: no toca a los clientes (para eso, POST /:id/precio). */
  async actualizarPlan(id: string, d: ActualizarItemPrecio): Promise<PlanAsesoramiento> {
    await this.planExistente(id);
    await this.prisma.planAsesoramiento.update({ where: { id }, data: d });
    return (await this.listarPlanes()).find((p) => p.id === id)!;
  }

  /** Las suscripciones del plan quedan con monto propio (planId → null). */
  async borrarPlan(id: string): Promise<void> {
    await this.planExistente(id);
    await this.prisma.planAsesoramiento.delete({ where: { id } });
  }

  /**
   * Asigna el plan a varios clientes. Sin suscripción: alta en el mes en curso al precio
   * del plan. Con una activa: cambia el plan y, si `aplicarPrecio`, el precio rige desde el
   * mes en curso. Se omiten los deshabilitados y los dados de baja.
   */
  async asignarPlan(id: string, d: AsignarPlan): Promise<ResultadoLote> {
    const plan = await this.planExistente(id);
    const clientes = await this.prisma.clienteAsesoramiento.findMany({
      where: { id: { in: d.clienteIds } },
      include: INCLUIR_CLIENTE,
    });
    const resultado: ResultadoLote = { actualizados: [], omitidos: [] };
    const actual = mesEnCurso();
    await this.prisma.$transaction(async (tx) => {
      for (const clienteId of d.clienteIds) {
        const c = clientes.find((x) => x.id === clienteId);
        const s = c?.suscripcion ? suscripcionDe(c.suscripcion) : null;
        if (!c) resultado.omitidos.push({ id: clienteId, motivo: 'No existe' });
        else if (c.deshabilitadoEn)
          resultado.omitidos.push({ id: clienteId, motivo: 'Está deshabilitado' });
        else if (!puedeAsignarPlan(s, actual))
          resultado.omitidos.push({ id: clienteId, motivo: 'Se dio de baja' });
        else {
          await escribirSuscripcion(
            tx,
            clienteId,
            conPlan(
              s,
              { id: plan.id, precio: plan.precio.toString() },
              d.aplicarPrecio ?? false,
              actual,
            ),
          );
          resultado.actualizados.push(clienteId);
        }
      }
    });
    return resultado;
  }

  /**
   * Nuevo precio del plan, aplicado desde el mes en curso solo a los clientes indicados
   * (por defecto el admin tilda los que pagaban el precio vigente; los atrasados quedan).
   */
  async actualizarPrecio(id: string, d: ActualizarPrecioPlan): Promise<ResultadoLote> {
    await this.planExistente(id);
    const precio = aString2Decimales(d.precio);
    const ids = d.clienteIds ?? [];
    const clientes = await this.prisma.clienteAsesoramiento.findMany({
      where: { id: { in: ids } },
      include: INCLUIR_CLIENTE,
    });
    const resultado: ResultadoLote = { actualizados: [], omitidos: [] };
    const actual = mesEnCurso();
    await this.prisma.$transaction(async (tx) => {
      await tx.planAsesoramiento.update({ where: { id }, data: { precio } });
      for (const clienteId of ids) {
        const c = clientes.find((x) => x.id === clienteId);
        const s = c?.suscripcion ? suscripcionDe(c.suscripcion) : null;
        if (!c || !s || s.planId !== id) {
          resultado.omitidos.push({ id: clienteId, motivo: 'No tiene este plan' });
        } else if (!suscripcionActiva(s, actual)) {
          resultado.omitidos.push({ id: clienteId, motivo: 'Se dio de baja' });
        } else {
          const desde = s.desde > actual ? s.desde : actual;
          await escribirSuscripcion(tx, clienteId, {
            ...s,
            historial: conNuevoMonto(s.historial, precio, desde),
          });
          resultado.actualizados.push(clienteId);
        }
      }
    });
    return resultado;
  }

  // --- Servicios -----------------------------------------------------------------------

  async listarServicios(): Promise<ServicioAsesoramiento[]> {
    const filas = await this.prisma.servicioAsesoramiento.findMany({ orderBy: { nombre: 'asc' } });
    return filas.map((s) => ({ id: s.id, nombre: s.nombre, precio: dec(s.precio) }));
  }

  async crearServicio(d: CrearItemPrecio): Promise<ServicioAsesoramiento> {
    const s = await this.prisma.servicioAsesoramiento.create({ data: d });
    return { id: s.id, nombre: s.nombre, precio: dec(s.precio) };
  }

  async actualizarServicio(id: string, d: ActualizarItemPrecio): Promise<ServicioAsesoramiento> {
    await this.servicioExistente(id);
    const s = await this.prisma.servicioAsesoramiento.update({ where: { id }, data: d });
    return { id: s.id, nombre: s.nombre, precio: dec(s.precio) };
  }

  async borrarServicio(id: string): Promise<void> {
    await this.servicioExistente(id);
    await this.prisma.servicioAsesoramiento.delete({ where: { id } });
  }

  // --- Helpers -------------------------------------------------------------------------

  private aBroker(b: Prisma.BrokerGetPayload<object>, clientes: number): BrokerAsesoramiento {
    return {
      id: b.id,
      faktiaReferencia: b.faktiaReferencia,
      nombre: b.nombre,
      email: b.email,
      telefono: b.telefono,
      notas: b.notas,
      fiscal: (b.fiscal as Fiscal | null) ?? null,
      clientes,
    };
  }

  private async nombreBrokerLibre(nombre: string, exceptoId?: string) {
    const existente = await this.prisma.broker.findFirst({
      where: {
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(exceptoId ? { id: { not: exceptoId } } : {}),
      },
    });
    if (existente) throw conflicto('BROKER_DUPLICADO', `Ya existe el broker "${existente.nombre}"`);
  }

  private async brokerExistente(id: string) {
    const b = await this.prisma.broker.findUnique({ where: { id } });
    if (!b) throw noEncontrado('No encontramos el broker');
    return b;
  }

  private async planExistente(id: string) {
    const p = await this.prisma.planAsesoramiento.findUnique({ where: { id } });
    if (!p) throw noEncontrado('No encontramos el plan');
    return p;
  }

  private async servicioExistente(id: string) {
    const s = await this.prisma.servicioAsesoramiento.findUnique({ where: { id } });
    if (!s) throw noEncontrado('No encontramos el servicio');
    return s;
  }
}
