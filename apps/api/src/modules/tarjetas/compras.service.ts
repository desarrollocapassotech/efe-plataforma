import { Injectable } from '@nestjs/common';
import { aString2Decimales } from '@efe/shared/dinero';
import type {
  ActualizarCompra,
  Compra,
  CrearCompra,
  ListarComprasQuery,
  Pagina,
} from '@efe/shared/schemas';
import { generarCuotas } from '@efe/shared/tarjetas';
import { Prisma, type Moneda } from '@prisma/client';
import { noEncontrado } from '../../common/errors/errores';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import {
  armarPagina,
  decodificarCursor,
  despuesDe,
  ORDEN_CRONOLOGICO_DESC,
} from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriasService, exigirCategoriaValida } from '../categorias/categorias.service';
import { exigirTarjetaActiva, RESUMIDA, TarjetasService } from './tarjetas.service';

const INCLUIR = {
  tarjeta: { select: RESUMIDA },
  categoria: { select: { id: true, nombre: true, color: true, icono: true } },
  cuotas: { orderBy: { numero: 'asc' } },
} satisfies Prisma.CompraTarjetaInclude;

type CompraConRelaciones = Prisma.CompraTarjetaGetPayload<{ include: typeof INCLUIR }>;

function aCompra(c: CompraConRelaciones): Compra {
  return {
    id: c.id,
    tarjeta: c.tarjeta,
    categoria: c.categoria,
    descripcion: c.descripcion,
    fecha: fechaDeDb(c.fecha),
    montoTotal: aString2Decimales(c.montoTotal.toString()),
    moneda: c.moneda,
    cantidadCuotas: c.cantidadCuotas,
    cuotas: c.cuotas.map((q) => ({
      numero: q.numero,
      monto: aString2Decimales(q.monto.toString()),
      periodoResumen: q.periodoResumen,
    })),
    creadoEn: c.creadoEn.toISOString(),
  };
}

/** Compras con tarjeta: cada una se guarda con sus cuotas (una por resumen). */
@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tarjetas: TarjetasService,
    private readonly categorias: CategoriasService,
  ) {}

  async listar(usuarioId: string, q: ListarComprasQuery): Promise<Pagina<Compra>> {
    const filas = await this.prisma.compraTarjeta.findMany({
      where: {
        usuarioId,
        ...(q.tarjetaId ? { tarjetaId: q.tarjetaId } : {}),
        ...(q.desde || q.hasta
          ? {
              fecha: {
                ...(q.desde ? { gte: fechaADb(q.desde) } : {}),
                ...(q.hasta ? { lte: fechaADb(q.hasta) } : {}),
              },
            }
          : {}),
        ...(q.cursor ? { AND: [despuesDe(decodificarCursor(q.cursor))] } : {}),
      },
      include: INCLUIR,
      orderBy: ORDEN_CRONOLOGICO_DESC,
      take: q.limit + 1,
    });
    return armarPagina(filas, q.limit, aCompra);
  }

  async crear(usuarioId: string, datos: CrearCompra): Promise<Compra> {
    const tarjeta = await this.tarjetas.obtenerPropia(usuarioId, datos.tarjetaId);
    exigirTarjetaActiva(tarjeta);
    if (datos.categoriaId) {
      exigirCategoriaValida(
        await this.categorias.obtenerPropia(usuarioId, datos.categoriaId),
        'GASTO',
      );
    }
    const moneda: Moneda = datos.moneda ?? 'ARS';
    const cantidadCuotas = datos.cantidadCuotas ?? 1;
    const overrides = (await this.tarjetas.overridesDe([tarjeta.id])).get(tarjeta.id) ?? [];
    const cuotas = generarCuotas(
      { fecha: datos.fecha, montoTotal: datos.montoTotal, cantidadCuotas },
      tarjeta,
      overrides,
    );
    const compra = await this.prisma.compraTarjeta.create({
      data: {
        usuarioId,
        tarjetaId: tarjeta.id,
        categoriaId: datos.categoriaId ?? null,
        descripcion: datos.descripcion,
        fecha: fechaADb(datos.fecha),
        montoTotal: datos.montoTotal,
        moneda,
        cantidadCuotas,
        cuotas: {
          create: cuotas.map((c) => ({ ...c, usuarioId, tarjetaId: tarjeta.id, moneda })),
        },
      },
      include: INCLUIR,
    });
    return aCompra(compra);
  }

  /** Cualquier cambio regenera todas las cuotas de la compra. */
  async actualizar(usuarioId: string, id: string, datos: ActualizarCompra): Promise<Compra> {
    const actual = await this.obtenerPropia(usuarioId, id);
    const tarjetaId = datos.tarjetaId ?? actual.tarjetaId;
    const tarjeta = await this.tarjetas.obtenerPropia(usuarioId, tarjetaId);
    if (tarjetaId !== actual.tarjetaId) exigirTarjetaActiva(tarjeta);
    if (datos.categoriaId && datos.categoriaId !== actual.categoriaId) {
      exigirCategoriaValida(
        await this.categorias.obtenerPropia(usuarioId, datos.categoriaId),
        'GASTO',
      );
    }
    const resultado = {
      fecha: datos.fecha ?? fechaDeDb(actual.fecha),
      montoTotal: datos.montoTotal ?? aString2Decimales(actual.montoTotal.toString()),
      cantidadCuotas: datos.cantidadCuotas ?? actual.cantidadCuotas,
      moneda: datos.moneda ?? actual.moneda,
    };
    const overrides = (await this.tarjetas.overridesDe([tarjeta.id])).get(tarjeta.id) ?? [];
    const cuotas = generarCuotas(resultado, tarjeta, overrides);

    const compra = await this.prisma.$transaction(async (tx) => {
      await tx.cuota.deleteMany({ where: { compraId: id } });
      return tx.compraTarjeta.update({
        where: { id },
        data: {
          tarjetaId: tarjeta.id,
          ...(datos.categoriaId !== undefined ? { categoriaId: datos.categoriaId } : {}),
          ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
          fecha: fechaADb(resultado.fecha),
          montoTotal: resultado.montoTotal,
          moneda: resultado.moneda,
          cantidadCuotas: resultado.cantidadCuotas,
          cuotas: {
            create: cuotas.map((c) => ({
              ...c,
              usuarioId,
              tarjetaId: tarjeta.id,
              moneda: resultado.moneda,
            })),
          },
        },
        include: INCLUIR,
      });
    });
    return aCompra(compra);
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropia(usuarioId, id);
    await this.prisma.compraTarjeta.delete({ where: { id } }); // Las cuotas se van en cascada.
  }

  private async obtenerPropia(usuarioId: string, id: string) {
    const compra = await this.prisma.compraTarjeta.findFirst({ where: { id, usuarioId } });
    if (!compra) throw noEncontrado('No encontramos la compra');
    return compra;
  }
}
