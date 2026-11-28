import { Injectable, Logger } from '@nestjs/common';
import { FEATURES_POR_PLAN } from '@efe/shared/features';
import {
  DIAS_PARA_PURGAR,
  TERMINOS_VERSION,
  type ActualizarMe,
  type Me,
} from '@efe/shared/schemas';
import type { Usuario } from '@prisma/client';
import { AuditoriaService } from '../../common/auditoria/auditoria.service';
import { CuentasFirebase } from '../../common/auth/cuentas-firebase';
import { PrismaService } from '../../prisma/prisma.service';

const DIA_MS = 86_400_000;

function aMe(usuario: Usuario): Me {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    plan: usuario.plan,
    monedaPrincipal: usuario.monedaPrincipal,
    onboardingCompletado: usuario.onboardingCompletado,
    features: [...FEATURES_POR_PLAN[usuario.plan]],
    creadoEn: usuario.creadoEn.toISOString(),
    terminosVersion: usuario.terminosVersion,
    terminosAceptadosEn: usuario.terminosAceptadosEn?.toISOString() ?? null,
  };
}

export interface ResultadoPurga {
  purgadas: number;
  errores: number;
}

@Injectable()
export class UsuariosService {
  private readonly logger = new Logger(UsuariosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly firebase: CuentasFirebase,
  ) {}

  async obtenerMe(usuarioId: string): Promise<Me> {
    return aMe(await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } }));
  }

  async actualizarMe(usuarioId: string, datos: ActualizarMe): Promise<Me> {
    return aMe(await this.prisma.usuario.update({ where: { id: usuarioId }, data: datos }));
  }

  /** Registra la aceptación de la versión vigente de términos y privacidad (fecha + versión). */
  async aceptarTerminos(usuarioId: string, ip?: string): Promise<Me> {
    const usuario = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { terminosVersion: TERMINOS_VERSION, terminosAceptadosEn: new Date() },
      });
      await this.auditoria.registrar(
        {
          accion: 'usuario.aceptar_terminos',
          entidad: 'Usuario',
          entidadId: usuarioId,
          usuarioId,
          actorId: usuarioId,
          datos: { version: TERMINOS_VERSION },
          ip,
        },
        tx,
      );
      return actualizado;
    });
    return aMe(usuario);
  }

  /**
   * Todos los datos del usuario en un JSON (Ley 25.326). Se arma en memoria: con los
   * volúmenes de una persona (miles de movimientos) alcanza; si crece, pasar a streaming.
   */
  async exportar(usuarioId: string, ip?: string) {
    const donde = { where: { usuarioId } };
    const [
      usuario,
      cuentas,
      categorias,
      movimientos,
      transferencias,
      recurrencias,
      tarjetas,
      compras,
      pagosResumen,
      objetivos,
      perfiles,
      suscripciones,
    ] = await Promise.all([
      this.prisma.usuario.findUniqueOrThrow({
        where: { id: usuarioId },
        omit: { firebaseUid: true },
      }),
      this.prisma.cuenta.findMany({ ...donde, orderBy: { orden: 'asc' } }),
      this.prisma.categoria.findMany({ ...donde, orderBy: [{ tipo: 'asc' }, { orden: 'asc' }] }),
      this.prisma.movimiento.findMany({
        ...donde,
        orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }],
      }),
      this.prisma.transferencia.findMany({ ...donde, orderBy: { fecha: 'asc' } }),
      this.prisma.recurrencia.findMany({ ...donde, orderBy: { creadoEn: 'asc' } }),
      this.prisma.tarjeta.findMany({
        ...donde,
        include: { cierres: true },
        orderBy: { creadoEn: 'asc' },
      }),
      this.prisma.compraTarjeta.findMany({
        ...donde,
        include: { cuotas: { orderBy: { numero: 'asc' } } },
        orderBy: { fecha: 'asc' },
      }),
      this.prisma.pagoResumen.findMany({ ...donde, orderBy: { fecha: 'asc' } }),
      this.prisma.objetivo.findMany({
        ...donde,
        include: { aportes: { orderBy: { fecha: 'asc' } } },
        orderBy: { creadoEn: 'asc' },
      }),
      this.prisma.perfilInversor.findMany(donde),
      this.prisma.suscripcion.findMany(donde),
    ]);
    await this.auditoria.registrar({
      accion: 'usuario.exportar',
      entidad: 'Usuario',
      entidadId: usuarioId,
      usuarioId,
      actorId: usuarioId,
      ip,
    });
    return {
      exportadoEn: new Date().toISOString(),
      formato: 'efe-plataforma/exportacion/v1',
      usuario,
      cuentas,
      categorias,
      movimientos,
      transferencias,
      recurrencias,
      tarjetas,
      compras,
      pagosResumen,
      objetivos,
      perfiles,
      suscripciones,
    };
  }

  /**
   * Baja de cuenta: marca `eliminadoEn` (se puede recuperar durante 30 días) y cierra las
   * sesiones de Firebase. El borrado definitivo lo hace el job `purgar-cuentas`.
   */
  async eliminar(usuarioId: string, ip?: string): Promise<{ purgaEn: string }> {
    const ahora = new Date();
    const usuario = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { eliminadoEn: ahora },
      });
      await this.auditoria.registrar(
        {
          accion: 'cuenta.eliminar',
          entidad: 'Usuario',
          entidadId: usuarioId,
          usuarioId,
          actorId: usuarioId,
          ip,
        },
        tx,
      );
      return actualizado;
    });
    try {
      await this.firebase.revocarSesiones(usuario.firebaseUid);
    } catch (error) {
      // La baja ya quedó registrada: si Firebase falla, las sesiones vencen solas en 1 h.
      this.logger.error(`No se pudieron revocar las sesiones de ${usuarioId}: ${String(error)}`);
    }
    return { purgaEn: new Date(ahora.getTime() + DIAS_PARA_PURGAR * DIA_MS).toISOString() };
  }

  /** Recupera una cuenta dada de baja (dentro de los 30 días). */
  async restaurar(usuarioId: string, ip?: string): Promise<Me> {
    const actual = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    if (!actual.eliminadoEn) return aMe(actual);
    const usuario = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({
        where: { id: usuarioId },
        data: { eliminadoEn: null },
      });
      await this.auditoria.registrar(
        {
          accion: 'cuenta.restaurar',
          entidad: 'Usuario',
          entidadId: usuarioId,
          usuarioId,
          actorId: usuarioId,
          datos: { eliminadoEn: actual.eliminadoEn!.toISOString() },
          ip,
        },
        tx,
      );
      return actualizado;
    });
    return aMe(usuario);
  }

  /**
   * Job `purgar-cuentas`: borra en cascada las cuentas dadas de baja hace más de 30 días.
   * Primero en Firebase (si falla, se reintenta al día siguiente) y después en Postgres.
   */
  async purgar(ahora = new Date()): Promise<ResultadoPurga> {
    const limite = new Date(ahora.getTime() - DIAS_PARA_PURGAR * DIA_MS);
    const vencidas = await this.prisma.usuario.findMany({
      where: { eliminadoEn: { lte: limite } },
      select: { id: true, firebaseUid: true, eliminadoEn: true },
    });
    const resultado: ResultadoPurga = { purgadas: 0, errores: 0 };
    for (const u of vencidas) {
      try {
        await this.firebase.borrarUsuario(u.firebaseUid);
        await this.prisma.$transaction(async (tx) => {
          await tx.usuario.delete({ where: { id: u.id } });
          // La fila de auditoría sobrevive: no tiene FK al usuario.
          await this.auditoria.registrar(
            {
              accion: 'cuenta.purgar',
              entidad: 'Usuario',
              entidadId: u.id,
              usuarioId: u.id,
              datos: { eliminadoEn: u.eliminadoEn!.toISOString() },
            },
            tx,
          );
        });
        resultado.purgadas++;
      } catch (error) {
        resultado.errores++;
        this.logger.error(`No se pudo purgar la cuenta ${u.id}: ${String(error)}`);
      }
    }
    return resultado;
  }
}
