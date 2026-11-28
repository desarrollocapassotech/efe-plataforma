import { Injectable } from '@nestjs/common';
import { porcentaje } from '@efe/shared/dinero';
import { hoy, sumarDias, ZONA_HORARIA_AR } from '@efe/shared/fechas';
import type {
  AuditoriaItem,
  CambiarPlan,
  ListarAuditoriaQuery,
  ListarUsuariosAdminQuery,
  Metricas,
  PaginaAdmin,
  UsuarioAdmin,
  UsuarioAdminDetalle,
} from '@efe/shared/schemas';
import { Prisma, type Usuario } from '@prisma/client';
import { noEncontrado } from '../../common/errors/errores';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import { AuditoriaService } from '../../common/auditoria/auditoria.service';
import { PrismaService } from '../../prisma/prisma.service';

const DIA_MS = 86_400_000;

/** Fin del día `fecha` (exclusivo) para filtrar columnas DateTime por días de negocio. */
const finDelDia = (fecha: string) => new Date(fechaADb(fecha).getTime() + DIA_MS);

/**
 * Admin de la plataforma: usuarios (sin datos financieros, solo contadores), cambio de
 * plan auditado, métricas de uso y auditoría.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditar: AuditoriaService,
  ) {}

  async listarUsuarios(q: ListarUsuariosAdminQuery): Promise<PaginaAdmin<UsuarioAdmin>> {
    const where: Prisma.UsuarioWhereInput = {
      ...(q.incluirEliminados ? {} : { eliminadoEn: null }),
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: 'insensitive' } },
              { nombre: { contains: q.q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(q.plan ? { plan: q.plan } : {}),
      ...(q.rol ? { rol: q.rol } : {}),
      ...(q.activoDias
        ? { ultimoAccesoEn: { gte: new Date(Date.now() - q.activoDias * DIA_MS) } }
        : {}),
      ...(q.desde || q.hasta
        ? {
            creadoEn: {
              ...(q.desde ? { gte: fechaADb(q.desde) } : {}),
              ...(q.hasta ? { lt: finDelDia(q.hasta) } : {}),
            },
          }
        : {}),
    };
    const [total, usuarios] = await Promise.all([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        // Desempate por email para que el orden sea estable entre páginas.
        orderBy: [
          // Los campos opcionales (último acceso, nombre) dejan los vacíos al final.
          q.orden === 'ultimoAccesoEn' || q.orden === 'nombre'
            ? { [q.orden]: { sort: q.dir, nulls: 'last' } }
            : { [q.orden]: q.dir },
          { email: 'asc' },
        ],
        skip: (q.pagina - 1) * q.limite,
        take: q.limite,
      }),
    ]);
    const conteos = await this.prisma.movimiento.groupBy({
      by: ['usuarioId'],
      where: { usuarioId: { in: usuarios.map((u) => u.id) } },
      _count: { _all: true },
    });
    return {
      items: usuarios.map((u) =>
        this.aUsuario(u, conteos.find((c) => c.usuarioId === u.id)?._count._all ?? 0),
      ),
      total,
      pagina: q.pagina,
      limite: q.limite,
    };
  }

  async obtenerUsuario(id: string): Promise<UsuarioAdminDetalle> {
    const u = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            cuentas: true,
            movimientos: true,
            recurrencias: true,
            tarjetas: true,
            compras: true,
            objetivos: true,
          },
        },
      },
    });
    if (!u) throw noEncontrado('No encontramos el usuario');
    return {
      ...this.aUsuario(u, u._count.movimientos),
      monedaPrincipal: u.monedaPrincipal,
      contadores: u._count,
    };
  }

  /** Cambio manual de plan (clientes de asesoramiento, pruebas), con auditoría. */
  async cambiarPlan(
    actorId: string,
    id: string,
    datos: CambiarPlan,
    ip?: string,
  ): Promise<UsuarioAdmin> {
    const actual = await this.prisma.usuario.findUnique({ where: { id } });
    if (!actual) throw noEncontrado('No encontramos el usuario');
    const usuario = await this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({ where: { id }, data: { plan: datos.plan } });
      await this.auditar.registrar(
        {
          accion: 'admin.cambiar_plan',
          entidad: 'Usuario',
          entidadId: id,
          usuarioId: id,
          actorId,
          datos: { anterior: actual.plan, nuevo: datos.plan, motivo: datos.motivo ?? null },
          ip,
        },
        tx,
      );
      return actualizado;
    });
    const movimientos = await this.prisma.movimiento.count({ where: { usuarioId: id } });
    return this.aUsuario(usuario, movimientos);
  }

  async metricas(): Promise<Metricas> {
    const base: Prisma.UsuarioWhereInput = { rol: 'USUARIO', eliminadoEn: null };
    const ahora = Date.now();
    const hoyAr = hoy();
    const desde = sumarDias(hoyAr, -29);
    // Inicio del primer día (Argentina) de la ventana de 30 días, en UTC.
    const inicioVentana = new Date(`${desde}T00:00:00-03:00`);

    const [
      totalUsuarios,
      activos7,
      activos30,
      conMovimientos,
      conOnboarding,
      conTarjetas,
      conObjetivos,
      conRecurrencias,
      registros,
      movimientos,
    ] = await Promise.all([
      this.prisma.usuario.count({ where: base }),
      this.prisma.usuario.count({
        where: { ...base, ultimoAccesoEn: { gte: new Date(ahora - 7 * DIA_MS) } },
      }),
      this.prisma.usuario.count({
        where: { ...base, ultimoAccesoEn: { gte: new Date(ahora - 30 * DIA_MS) } },
      }),
      this.prisma.usuario.count({ where: { ...base, movimientos: { some: {} } } }),
      this.prisma.usuario.count({ where: { ...base, onboardingCompletado: true } }),
      this.prisma.usuario.count({ where: { ...base, tarjetas: { some: {} } } }),
      this.prisma.usuario.count({ where: { ...base, objetivos: { some: {} } } }),
      this.prisma.usuario.count({ where: { ...base, recurrencias: { some: {} } } }),
      this.prisma.$queryRaw<{ fecha: Date; cantidad: bigint }[]>(Prisma.sql`
        SELECT ("creadoEn" AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA_AR})::date AS fecha,
               COUNT(*) AS cantidad
        FROM usuarios
        WHERE rol = 'USUARIO' AND "eliminadoEn" IS NULL AND "creadoEn" >= ${inicioVentana}
        GROUP BY 1
      `),
      this.prisma.$queryRaw<{ fecha: Date; cantidad: bigint }[]>(Prisma.sql`
        SELECT (m."creadoEn" AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA_AR})::date AS fecha,
               COUNT(*) AS cantidad
        FROM movimientos m
        JOIN usuarios u ON u.id = m."usuarioId"
        WHERE u.rol = 'USUARIO' AND u."eliminadoEn" IS NULL AND m."creadoEn" >= ${inicioVentana}
        GROUP BY 1
      `),
    ]);

    // Todos los días de la ventana, con 0 donde no hubo nada.
    const serie = (filas: { fecha: Date; cantidad: bigint }[]) =>
      Array.from({ length: 30 }, (_, i) => {
        const fecha = sumarDias(desde, i);
        const fila = filas.find((f) => fechaDeDb(f.fecha) === fecha);
        return { fecha, cantidad: fila ? Number(fila.cantidad) : 0 };
      });

    return {
      totalUsuarios,
      activos7,
      activos30,
      conMovimientos,
      onboardingCompletado: porcentaje(conOnboarding, totalUsuarios),
      registrosPorDia: serie(registros),
      movimientosPorDia: serie(movimientos),
      usoModulos: { conTarjetas, conObjetivos, conRecurrencias },
    };
  }

  async auditoria(q: ListarAuditoriaQuery): Promise<PaginaAdmin<AuditoriaItem>> {
    const where: Prisma.AuditoriaWhereInput = {
      ...(q.accion ? { accion: { contains: q.accion, mode: 'insensitive' } } : {}),
      ...(q.usuarioId ? { OR: [{ usuarioId: q.usuarioId }, { actorId: q.usuarioId }] } : {}),
      ...(q.desde || q.hasta
        ? {
            creadoEn: {
              ...(q.desde ? { gte: fechaADb(q.desde) } : {}),
              ...(q.hasta ? { lt: finDelDia(q.hasta) } : {}),
            },
          }
        : {}),
    };
    const [total, filas] = await Promise.all([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        orderBy: [{ creadoEn: q.dir }, { id: q.dir }],
        skip: (q.pagina - 1) * q.limite,
        take: q.limite,
      }),
    ]);
    // Auditoria no tiene relaciones (los usuarios pueden borrarse): se buscan los emails aparte.
    const ids = [
      ...new Set(filas.flatMap((f) => [f.usuarioId, f.actorId]).filter(Boolean)),
    ] as string[];
    const personas = await this.prisma.usuario.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    });
    const persona = (id: string | null) =>
      id ? (personas.find((p) => p.id === id) ?? { id, email: '(eliminado)' }) : null;
    return {
      items: filas.map((f) => ({
        id: f.id,
        accion: f.accion,
        entidad: f.entidad,
        entidadId: f.entidadId,
        usuario: persona(f.usuarioId),
        actor: persona(f.actorId),
        datos: f.datos,
        ip: f.ip,
        creadoEn: f.creadoEn.toISOString(),
      })),
      total,
      pagina: q.pagina,
      limite: q.limite,
    };
  }

  private aUsuario(u: Usuario, movimientos: number): UsuarioAdmin {
    return {
      id: u.id,
      email: u.email,
      nombre: u.nombre,
      rol: u.rol,
      plan: u.plan,
      onboardingCompletado: u.onboardingCompletado,
      creadoEn: u.creadoEn.toISOString(),
      ultimoAccesoEn: u.ultimoAccesoEn?.toISOString() ?? null,
      eliminadoEn: u.eliminadoEn?.toISOString() ?? null,
      movimientos,
    };
  }
}
