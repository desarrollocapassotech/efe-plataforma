import { Injectable } from '@nestjs/common';
import { aString2Decimales } from '@efe/shared/dinero';
import type {
  ActualizarMovimiento,
  CrearMovimiento,
  ListarMovimientosQuery,
  Movimiento,
  Pagina,
} from '@efe/shared/schemas';
import { Prisma } from '@prisma/client';
import { noEncontrado, noProcesable } from '../../common/errors/errores';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import {
  armarPagina,
  decodificarCursor,
  despuesDe,
  ORDEN_CRONOLOGICO_DESC,
} from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriasService, exigirCategoriaValida } from '../categorias/categorias.service';
import { CuentasService, exigirCuentaActiva } from '../cuentas/cuentas.service';

const INCLUIR = {
  cuenta: { select: { id: true, nombre: true, tipo: true, moneda: true } },
  categoria: { select: { id: true, nombre: true, color: true, icono: true } },
} satisfies Prisma.MovimientoInclude;

type MovimientoDb = Prisma.MovimientoGetPayload<{ include: typeof INCLUIR }>;

function aMovimiento(m: MovimientoDb): Movimiento {
  return {
    id: m.id,
    tipo: m.tipo,
    monto: aString2Decimales(m.monto.toString()),
    moneda: m.moneda,
    fecha: fechaDeDb(m.fecha),
    descripcion: m.descripcion,
    cuenta: m.cuenta,
    categoria: m.categoria,
    recurrenciaId: m.recurrenciaId,
    creadoEn: m.creadoEn.toISOString(),
  };
}

@Injectable()
export class MovimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentas: CuentasService,
    private readonly categorias: CategoriasService,
  ) {}

  async listar(usuarioId: string, q: ListarMovimientosQuery): Promise<Pagina<Movimiento>> {
    const where: Prisma.MovimientoWhereInput = {
      usuarioId,
      ...(q.desde || q.hasta
        ? {
            fecha: {
              ...(q.desde ? { gte: fechaADb(q.desde) } : {}),
              ...(q.hasta ? { lte: fechaADb(q.hasta) } : {}),
            },
          }
        : {}),
      ...(q.tipo ? { tipo: q.tipo } : {}),
      ...(q.cuentaId ? { cuentaId: q.cuentaId } : {}),
      ...(q.categoriaId ? { categoriaId: q.categoriaId } : {}),
      ...(q.q ? { descripcion: { contains: q.q, mode: 'insensitive' } } : {}),
      ...(q.cursor ? { AND: [despuesDe(decodificarCursor(q.cursor))] } : {}),
    };
    const filas = await this.prisma.movimiento.findMany({
      where,
      include: INCLUIR,
      orderBy: ORDEN_CRONOLOGICO_DESC,
      take: q.limit + 1,
    });
    return armarPagina(filas, q.limit, aMovimiento);
  }

  async crear(usuarioId: string, datos: CrearMovimiento): Promise<Movimiento> {
    const cuenta = await this.cuentas.obtenerPropia(usuarioId, datos.cuentaId);
    exigirCuentaActiva(cuenta);
    if (datos.categoriaId) {
      exigirCategoriaValida(
        await this.categorias.obtenerPropia(usuarioId, datos.categoriaId),
        datos.tipo,
      );
    }
    const movimiento = await this.prisma.movimiento.create({
      data: {
        usuarioId,
        cuentaId: cuenta.id,
        categoriaId: datos.categoriaId ?? null,
        tipo: datos.tipo,
        monto: datos.monto,
        // La moneda es siempre la de la cuenta.
        moneda: cuenta.moneda,
        fecha: fechaADb(datos.fecha),
        descripcion: datos.descripcion ?? null,
      },
      include: INCLUIR,
    });
    return aMovimiento(movimiento);
  }

  /**
   * Edita fecha, cuenta (de la misma moneda), categoría, monto o descripción.
   * Si el movimiento lo generó una recurrencia, se desvincula (recurrenciaId y
   * periodoRecurrencia a null): así el job no lo vuelve a crear ni pisa la edición.
   */
  async actualizar(
    usuarioId: string,
    id: string,
    datos: ActualizarMovimiento,
  ): Promise<Movimiento> {
    const actual = await this.obtenerPropio(usuarioId, id);
    const data: Prisma.MovimientoUncheckedUpdateInput = {
      recurrenciaId: null,
      periodoRecurrencia: null,
    };

    if (datos.cuentaId !== undefined && datos.cuentaId !== actual.cuentaId) {
      const cuenta = await this.cuentas.obtenerPropia(usuarioId, datos.cuentaId);
      exigirCuentaActiva(cuenta);
      if (cuenta.moneda !== actual.moneda) {
        throw noProcesable(
          'CUENTA_MONEDA_DISTINTA',
          `La cuenta "${cuenta.nombre}" es en ${cuenta.moneda} y el movimiento en ${actual.moneda}`,
        );
      }
      data.cuentaId = cuenta.id;
    }
    if (datos.categoriaId !== undefined && datos.categoriaId !== actual.categoriaId) {
      if (datos.categoriaId) {
        exigirCategoriaValida(
          await this.categorias.obtenerPropia(usuarioId, datos.categoriaId),
          actual.tipo,
        );
      }
      data.categoriaId = datos.categoriaId;
    }
    if (datos.monto !== undefined) data.monto = datos.monto;
    if (datos.fecha !== undefined) data.fecha = fechaADb(datos.fecha);
    if (datos.descripcion !== undefined) data.descripcion = datos.descripcion;

    const movimiento = await this.prisma.movimiento.update({
      where: { id },
      data,
      include: INCLUIR,
    });
    return aMovimiento(movimiento);
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropio(usuarioId, id);
    await this.prisma.movimiento.delete({ where: { id } });
  }

  private async obtenerPropio(usuarioId: string, id: string) {
    const movimiento = await this.prisma.movimiento.findFirst({ where: { id, usuarioId } });
    if (!movimiento) throw noEncontrado('No encontramos el movimiento');
    return movimiento;
  }
}
