import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  errorSuscripcion,
  estaAtrasado,
  mesEnCurso,
  montoActual,
  periodoBajaHoy,
  suscripcionActiva,
  type Suscripcion,
} from '@efe/shared/asesoramiento';
import { aString2Decimales } from '@efe/shared/dinero';
import type {
  ActualizarCliente,
  ClienteAsesoramiento,
  CrearCliente,
  DeshabilitarCliente,
  Fiscal,
  ListarClientesQuery,
  SuscripcionCliente,
} from '@efe/shared/schemas';
import { Prisma } from '@prisma/client';
import { AuditoriaService } from '../../common/auditoria/auditoria.service';
import { conflicto, noEncontrado, noProcesable } from '../../common/errors/errores';
import { PrismaService } from '../../prisma/prisma.service';

type Cliente = Prisma.TransactionClient | PrismaService;

export const INCLUIR_CLIENTE = {
  brokers: { include: { broker: { select: { id: true, nombre: true } } } },
  usuario: { select: { id: true, email: true } },
  suscripcion: {
    include: { plan: { select: { id: true, nombre: true, precio: true } }, historial: true },
  },
} satisfies Prisma.ClienteAsesoramientoInclude;

type ClienteDb = Prisma.ClienteAsesoramientoGetPayload<{ include: typeof INCLUIR_CLIENTE }>;

/** Suscripción de la base → la forma pura de @efe/shared/asesoramiento. */
export function suscripcionDe(s: NonNullable<ClienteDb['suscripcion']>): Suscripcion {
  return {
    planId: s.planId,
    desde: s.desde,
    hasta: s.hasta,
    historial: s.historial
      .map((h) => ({ monto: aString2Decimales(h.monto.toString()), desde: h.desde }))
      .sort((a, b) => a.desde.localeCompare(b.desde)),
  };
}

function aCliente(c: ClienteDb, actual = mesEnCurso()): ClienteAsesoramiento {
  const s = c.suscripcion ? suscripcionDe(c.suscripcion) : null;
  const plan = c.suscripcion?.plan;
  return {
    id: c.id,
    faktiaReferencia: c.faktiaReferencia,
    nombre: c.nombre,
    apellido: c.apellido,
    email: c.email,
    telefono: c.telefono,
    perfilInversor: c.perfilInversor,
    objetivos: c.objetivos,
    horizonteInversion: c.horizonteInversion,
    fiscal: (c.fiscal as Fiscal | null) ?? null,
    notas: (c.notas as ClienteAsesoramiento['notas'] | null) ?? [],
    ultimoContacto: c.ultimoContacto?.toISOString() ?? null,
    deshabilitadoEn: c.deshabilitadoEn?.toISOString() ?? null,
    motivoDeshabilitacion: c.motivoDeshabilitacion,
    creadoEn: c.creadoEn.toISOString(),
    brokers: c.brokers.map((b) => b.broker).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    usuario: c.usuario,
    suscripcion: s
      ? {
          ...s,
          plan: plan ? { id: plan.id, nombre: plan.nombre } : null,
          montoActual: montoActual(s, actual) ?? null,
          activa: suscripcionActiva(s, actual),
          atrasado: plan
            ? estaAtrasado(s, [{ id: plan.id, precio: plan.precio.toString() }], actual)
            : false,
        }
      : null,
  };
}

const json = (v: unknown) => (v === null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

/**
 * Clientes de asesoramiento. Reglas de apps/admin/CLAUDE.md: nunca se borran (baja
 * lógica); al deshabilitar se ofrece dar de baja la suscripción; habilitar no la reactiva.
 */
@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(q: ListarClientesQuery): Promise<ClienteAsesoramiento[]> {
    const filas = await this.prisma.clienteAsesoramiento.findMany({
      where: {
        ...(q.estado === 'habilitados' ? { deshabilitadoEn: null } : {}),
        ...(q.estado === 'deshabilitados' ? { deshabilitadoEn: { not: null } } : {}),
        ...(q.q
          ? {
              OR: ['nombre', 'apellido', 'email'].map((campo) => ({
                [campo]: { contains: q.q, mode: 'insensitive' as const },
              })),
            }
          : {}),
        ...(q.brokerId ? { brokers: { some: { brokerId: q.brokerId } } } : {}),
        ...(q.planId ? { suscripcion: { planId: q.planId } } : {}),
        ...(q.perfil ? { perfilInversor: q.perfil } : {}),
      },
      include: INCLUIR_CLIENTE,
      orderBy: [{ creadoEn: 'desc' }, { apellido: 'asc' }],
    });
    const actual = mesEnCurso();
    return filas.map((c) => aCliente(c, actual));
  }

  async obtener(id: string): Promise<ClienteAsesoramiento> {
    return aCliente(await this.cargar(this.prisma, id));
  }

  /**
   * Alta. `faktiaReferencia` de los clientes nuevos es un UUID propio (los migrados de
   * Firestore conservan el id del doc, que es lo que Faktia ya conoce).
   */
  async crear(datos: CrearCliente): Promise<ClienteAsesoramiento> {
    await this.exigirBrokers(datos.brokerIds ?? []);
    const creado = await this.prisma.clienteAsesoramiento.create({
      data: {
        faktiaReferencia: randomUUID(),
        ...this.campos(datos),
        nombre: datos.nombre,
        apellido: datos.apellido,
        brokers: { create: (datos.brokerIds ?? []).map((brokerId) => ({ brokerId })) },
      },
      include: INCLUIR_CLIENTE,
    });
    return aCliente(creado);
  }

  async actualizar(id: string, datos: ActualizarCliente): Promise<ClienteAsesoramiento> {
    await this.cargar(this.prisma, id);
    if (datos.brokerIds) await this.exigirBrokers(datos.brokerIds);
    const actualizado = await this.prisma.$transaction(async (tx) => {
      if (datos.brokerIds) {
        await tx.clienteBroker.deleteMany({ where: { clienteId: id } });
        await tx.clienteBroker.createMany({
          data: datos.brokerIds.map((brokerId) => ({ clienteId: id, brokerId })),
        });
      }
      await tx.clienteAsesoramiento.update({ where: { id }, data: this.campos(datos) });
      return this.cargar(tx, id);
    });
    return aCliente(actualizado);
  }

  async deshabilitar(id: string, datos: DeshabilitarCliente): Promise<ClienteAsesoramiento> {
    const actual = await this.cargar(this.prisma, id);
    const resultado = await this.prisma.$transaction(async (tx) => {
      await tx.clienteAsesoramiento.update({
        where: { id },
        data: { deshabilitadoEn: new Date(), motivoDeshabilitacion: datos.motivo?.trim() || null },
      });
      const baja =
        (datos.darDeBajaSuscripcion ?? true) && actual.suscripcion
          ? periodoBajaHoy(suscripcionDe(actual.suscripcion))
          : null;
      if (baja)
        await tx.suscripcionAsesoramiento.update({
          where: { clienteId: id },
          data: { hasta: baja },
        });
      return this.cargar(tx, id);
    });
    return aCliente(resultado);
  }

  /** Vuelve a habilitar. No reactiva la suscripción (se hace aparte si corresponde). */
  async habilitar(id: string): Promise<ClienteAsesoramiento> {
    await this.cargar(this.prisma, id);
    await this.prisma.clienteAsesoramiento.update({
      where: { id },
      data: { deshabilitadoEn: null, motivoDeshabilitacion: null },
    });
    return this.obtener(id);
  }

  /** Reemplaza la suscripción completa (alta, baja, plan e historial de montos). */
  async guardarSuscripcion(id: string, s: SuscripcionCliente): Promise<ClienteAsesoramiento> {
    await this.cargar(this.prisma, id);
    const error = errorSuscripcion(s);
    if (error) throw noProcesable('SUSCRIPCION_INVALIDA', error);
    if (
      s.planId &&
      !(await this.prisma.planAsesoramiento.findUnique({ where: { id: s.planId } }))
    ) {
      throw noEncontrado('No encontramos el plan');
    }
    await this.prisma.$transaction((tx) => escribirSuscripcion(tx, id, s));
    return this.obtener(id);
  }

  /**
   * Vincula el cliente con un usuario de la plataforma y le pone plan ASESORAMIENTO
   * (auditado). Con null, desvincula (el plan del usuario no se toca).
   */
  async vincularUsuario(
    actorId: string,
    id: string,
    usuarioId: string | null,
    ip?: string,
  ): Promise<ClienteAsesoramiento> {
    const cliente = await this.cargar(this.prisma, id);
    if (usuarioId) {
      const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
      if (!usuario) throw noEncontrado('No encontramos el usuario de la plataforma');
      const otro = await this.prisma.clienteAsesoramiento.findUnique({ where: { usuarioId } });
      if (otro && otro.id !== id) {
        throw conflicto('USUARIO_YA_VINCULADO', 'Ese usuario ya está vinculado con otro cliente');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.clienteAsesoramiento.update({ where: { id }, data: { usuarioId } });
      if (usuarioId) {
        await tx.usuario.update({ where: { id: usuarioId }, data: { plan: 'ASESORAMIENTO' } });
      }
      await this.auditoria.registrar(
        {
          accion: 'admin.vincular_cliente',
          entidad: 'ClienteAsesoramiento',
          entidadId: id,
          usuarioId: usuarioId ?? cliente.usuarioId,
          actorId,
          datos: { anterior: cliente.usuarioId, nuevo: usuarioId },
          ip,
        },
        tx,
      );
    });
    return this.obtener(id);
  }

  private campos(d: ActualizarCliente) {
    return {
      ...(d.nombre !== undefined ? { nombre: d.nombre } : {}),
      ...(d.apellido !== undefined ? { apellido: d.apellido } : {}),
      ...(d.email !== undefined ? { email: d.email } : {}),
      ...(d.telefono !== undefined ? { telefono: d.telefono } : {}),
      ...(d.perfilInversor !== undefined ? { perfilInversor: d.perfilInversor } : {}),
      ...(d.objetivos !== undefined ? { objetivos: d.objetivos } : {}),
      ...(d.horizonteInversion !== undefined ? { horizonteInversion: d.horizonteInversion } : {}),
      ...(d.fiscal !== undefined ? { fiscal: json(d.fiscal) } : {}),
      ...(d.notas !== undefined ? { notas: json(d.notas) } : {}),
      ...(d.ultimoContacto !== undefined
        ? { ultimoContacto: d.ultimoContacto ? new Date(d.ultimoContacto) : null }
        : {}),
    };
  }

  private async exigirBrokers(ids: string[]) {
    const encontrados = await this.prisma.broker.count({ where: { id: { in: ids } } });
    if (encontrados !== new Set(ids).size)
      throw noEncontrado('No encontramos alguno de los brokers');
  }

  private async cargar(cliente: Cliente, id: string): Promise<ClienteDb> {
    const c = await cliente.clienteAsesoramiento.findUnique({
      where: { id },
      include: INCLUIR_CLIENTE,
    });
    if (!c) throw noEncontrado('No encontramos el cliente');
    return c;
  }
}

/** Upsert de la suscripción con su historial completo (lo usan clientes y planes). */
export async function escribirSuscripcion(
  tx: Prisma.TransactionClient,
  clienteId: string,
  s: Suscripcion,
): Promise<void> {
  const guardada = await tx.suscripcionAsesoramiento.upsert({
    where: { clienteId },
    create: { clienteId, planId: s.planId, desde: s.desde, hasta: s.hasta },
    update: { planId: s.planId, desde: s.desde, hasta: s.hasta },
  });
  await tx.montoSuscripcion.deleteMany({ where: { suscripcionId: guardada.id } });
  await tx.montoSuscripcion.createMany({
    data: s.historial.map((h) => ({ suscripcionId: guardada.id, monto: h.monto, desde: h.desde })),
  });
}
