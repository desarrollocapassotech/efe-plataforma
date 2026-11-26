import { Injectable } from '@nestjs/common';
import { aString2Decimales, comparar, MONEDAS, restar, type Moneda } from '@efe/shared/dinero';
import { hoy, periodoDe, sumarPeriodos, type Periodo } from '@efe/shared/fechas';
import {
  cierreCorrespondeAPeriodo,
  type ActualizarTarjeta,
  type CierreTarjeta,
  type Compromisos,
  type CompromisosQuery,
  type CrearTarjeta,
  type ListarTarjetasQuery,
  type ResumenFechas,
  type ResumenTarjeta,
  type ResumenTarjetaQuery,
  type SaldoResumen,
  type Tarjeta,
  type TarjetaResumida,
} from '@efe/shared/schemas';
import {
  generarCuotas,
  proximoResumen,
  resumenDelPeriodo,
  type CierreOverride,
  type ConfigTarjeta,
} from '@efe/shared/tarjetas';
import { Prisma, type Tarjeta as TarjetaDb } from '@prisma/client';
import { conflicto, noEncontrado, noProcesable } from '../../common/errors/errores';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import { PrismaService } from '../../prisma/prisma.service';
import { aPago, INCLUIR_PAGO } from './mapeos';

type Cliente = Prisma.TransactionClient | PrismaService;

export const RESUMIDA = {
  id: true,
  nombre: true,
  red: true,
  ultimos4: true,
  color: true,
} satisfies Prisma.TarjetaSelect;

export const aResumida = (t: TarjetaResumida): TarjetaResumida => ({
  id: t.id,
  nombre: t.nombre,
  red: t.red,
  ultimos4: t.ultimos4,
  color: t.color,
});

const configDe = (t: Pick<TarjetaDb, 'diaCierre' | 'diaVencimiento'>): ConfigTarjeta => ({
  diaCierre: t.diaCierre,
  diaVencimiento: t.diaVencimiento,
});

const clave = (tarjetaId: string, periodo: string) => `${tarjetaId}|${periodo}`;

/** Las tarjetas archivadas no reciben compras nuevas. */
export function exigirTarjetaActiva(tarjeta: TarjetaDb): void {
  if (tarjeta.archivada) {
    throw noProcesable('TARJETA_ARCHIVADA', `La tarjeta "${tarjeta.nombre}" está archivada`);
  }
}

@Injectable()
export class TarjetasService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerPropia(usuarioId: string, id: string): Promise<TarjetaDb> {
    const tarjeta = await this.prisma.tarjeta.findFirst({ where: { id, usuarioId } });
    if (!tarjeta) throw noEncontrado('No encontramos la tarjeta');
    return tarjeta;
  }

  /** Overrides de fechas cargados para una o varias tarjetas, por tarjeta. */
  async overridesDe(tarjetaIds: string[], cliente: Cliente = this.prisma) {
    const filas = await cliente.cierreTarjeta.findMany({
      where: { tarjetaId: { in: tarjetaIds } },
    });
    const porTarjeta = new Map<string, CierreOverride[]>();
    for (const f of filas) {
      const lista = porTarjeta.get(f.tarjetaId) ?? [];
      lista.push({
        periodo: f.periodo,
        fechaCierre: fechaDeDb(f.fechaCierre),
        fechaVencimiento: fechaDeDb(f.fechaVencimiento),
      });
      porTarjeta.set(f.tarjetaId, lista);
    }
    return porTarjeta;
  }

  async listar(usuarioId: string, q: ListarTarjetasQuery): Promise<Tarjeta[]> {
    const tarjetas = await this.prisma.tarjeta.findMany({
      where: { usuarioId, ...(q.incluirArchivadas ? {} : { archivada: false }) },
      orderBy: [{ archivada: 'asc' }, { creadoEn: 'asc' }],
    });
    if (tarjetas.length === 0) return [];
    const overrides = await this.overridesDe(tarjetas.map((t) => t.id));
    const hoyAr = hoy();
    const proximos = tarjetas.map((t) => ({
      tarjeta: t,
      resumen: proximoResumen(hoyAr, configDe(t), overrides.get(t.id) ?? []),
    }));
    const saldos = await this.saldos(
      usuarioId,
      proximos.map((p) => ({ tarjetaId: p.tarjeta.id, periodo: p.resumen.periodo })),
    );
    return proximos.map(({ tarjeta, resumen }) =>
      this.aTarjeta(tarjeta, resumen, saldos.get(clave(tarjeta.id, resumen.periodo)) ?? []),
    );
  }

  async crear(usuarioId: string, datos: CrearTarjeta): Promise<Tarjeta> {
    const tarjeta = await this.prisma.tarjeta.create({
      data: {
        usuarioId,
        nombre: datos.nombre,
        red: datos.red ?? 'OTRA',
        ultimos4: datos.ultimos4 ?? null,
        diaCierre: datos.diaCierre,
        diaVencimiento: datos.diaVencimiento,
        color: datos.color ?? null,
      },
    });
    return this.aTarjeta(tarjeta, proximoResumen(hoy(), configDe(tarjeta)), []);
  }

  /**
   * Si cambia el día de cierre o de vencimiento, se recalculan los períodos de las cuotas
   * desde el próximo resumen a pagar (los resúmenes ya vencidos no se tocan).
   */
  async actualizar(usuarioId: string, id: string, datos: ActualizarTarjeta): Promise<Tarjeta> {
    const actual = await this.obtenerPropia(usuarioId, id);
    const cambiaCalendario =
      (datos.diaCierre !== undefined && datos.diaCierre !== actual.diaCierre) ||
      (datos.diaVencimiento !== undefined && datos.diaVencimiento !== actual.diaVencimiento);

    await this.prisma.$transaction(async (tx) => {
      const tarjeta = await tx.tarjeta.update({ where: { id }, data: datos });
      if (cambiaCalendario) {
        const overrides = (await this.overridesDe([id], tx)).get(id) ?? [];
        const desde = proximoResumen(hoy(), configDe(actual), overrides).periodo;
        await this.recalcularPeriodos(tx, tarjeta, desde, overrides);
      }
    });
    return this.obtener(usuarioId, id);
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropia(usuarioId, id);
    const { _count } = await this.prisma.tarjeta.findUniqueOrThrow({
      where: { id },
      select: { _count: { select: { compras: true, pagos: true } } },
    });
    if (_count.compras > 0 || _count.pagos > 0) {
      throw conflicto(
        'TARJETA_CON_COMPRAS',
        'La tarjeta tiene compras o pagos cargados: archivala en lugar de borrarla',
      );
    }
    await this.prisma.tarjeta.delete({ where: { id } });
  }

  /** Carga (o corrige) las fechas reales de un resumen y recalcula las cuotas desde ese período. */
  async guardarCierre(
    usuarioId: string,
    id: string,
    periodo: Periodo,
    datos: CierreTarjeta,
  ): Promise<ResumenFechas> {
    const tarjeta = await this.obtenerPropia(usuarioId, id);
    if (!cierreCorrespondeAPeriodo(periodo, datos)) {
      throw noProcesable(
        'CIERRE_INVALIDO',
        `El vencimiento tiene que caer en el mes del período (${periodo})`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const fechas = {
        fechaCierre: fechaADb(datos.fechaCierre),
        fechaVencimiento: fechaADb(datos.fechaVencimiento),
      };
      await tx.cierreTarjeta.upsert({
        where: { tarjetaId_periodo: { tarjetaId: id, periodo } },
        create: { tarjetaId: id, periodo, ...fechas },
        update: fechas,
      });
      const overrides = (await this.overridesDe([id], tx)).get(id) ?? [];
      await this.recalcularPeriodos(tx, tarjeta, periodo, overrides);
    });
    return { periodo, ...datos };
  }

  /** Vuelve a las fechas calculadas de un período. */
  async borrarCierre(usuarioId: string, id: string, periodo: Periodo): Promise<void> {
    const tarjeta = await this.obtenerPropia(usuarioId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.cierreTarjeta.deleteMany({ where: { tarjetaId: id, periodo } });
      const overrides = (await this.overridesDe([id], tx)).get(id) ?? [];
      await this.recalcularPeriodos(tx, tarjeta, periodo, overrides);
    });
  }

  /**
   * Recalcula el período de las cuotas de una tarjeta con período >= `desde`, con el
   * calendario y los overrides actuales. Solo actualiza las que cambian.
   */
  async recalcularPeriodos(
    tx: Prisma.TransactionClient,
    tarjeta: Pick<TarjetaDb, 'id' | 'diaCierre' | 'diaVencimiento'>,
    desde: Periodo,
    overrides: CierreOverride[],
  ): Promise<number> {
    const compras = await tx.compraTarjeta.findMany({
      where: { tarjetaId: tarjeta.id, cuotas: { some: { periodoResumen: { gte: desde } } } },
      include: { cuotas: true },
    });
    let cambiadas = 0;
    for (const compra of compras) {
      const nuevas = generarCuotas(
        {
          fecha: fechaDeDb(compra.fecha),
          montoTotal: aString2Decimales(compra.montoTotal.toString()),
          cantidadCuotas: compra.cantidadCuotas,
        },
        configDe(tarjeta),
        overrides,
      );
      for (const cuota of compra.cuotas) {
        const nuevoPeriodo = nuevas[cuota.numero - 1]?.periodoResumen;
        if (
          cuota.periodoResumen >= desde &&
          nuevoPeriodo &&
          nuevoPeriodo !== cuota.periodoResumen
        ) {
          await tx.cuota.update({
            where: { id: cuota.id },
            data: { periodoResumen: nuevoPeriodo },
          });
          cambiadas++;
        }
      }
    }
    return cambiadas;
  }

  /** Detalle de resúmenes: uno por tarjeta (todas las activas si no se pide una). */
  async resumen(usuarioId: string, q: ResumenTarjetaQuery): Promise<ResumenTarjeta[]> {
    const tarjetas = q.tarjetaId
      ? [await this.obtenerPropia(usuarioId, q.tarjetaId)]
      : await this.prisma.tarjeta.findMany({
          where: { usuarioId, archivada: false },
          orderBy: { creadoEn: 'asc' },
        });
    if (tarjetas.length === 0) return [];
    const overrides = await this.overridesDe(tarjetas.map((t) => t.id));
    const hoyAr = hoy();
    const elegidos = tarjetas.map((t) => {
      const propios = overrides.get(t.id) ?? [];
      const periodo = q.periodo ?? proximoResumen(hoyAr, configDe(t), propios).periodo;
      return {
        tarjeta: t,
        fechas: resumenDelPeriodo(periodo, configDe(t), propios),
        fechasManuales: propios.some((o) => o.periodo === periodo),
      };
    });

    const condicion = elegidos.map((e) => ({ tarjetaId: e.tarjeta.id, periodo: e.fechas.periodo }));
    const [cuotas, pagos, saldos] = await Promise.all([
      this.prisma.cuota.findMany({
        where: {
          usuarioId,
          OR: condicion.map((c) => ({ tarjetaId: c.tarjetaId, periodoResumen: c.periodo })),
        },
        include: {
          compra: {
            select: {
              id: true,
              descripcion: true,
              fecha: true,
              cantidadCuotas: true,
              categoria: { select: { id: true, nombre: true, color: true, icono: true } },
            },
          },
        },
        orderBy: [{ compra: { fecha: 'asc' } }, { compra: { creadoEn: 'asc' } }],
      }),
      this.prisma.pagoResumen.findMany({
        where: { usuarioId, OR: condicion },
        include: INCLUIR_PAGO,
        orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }],
      }),
      this.saldos(usuarioId, condicion),
    ]);

    return elegidos.map(({ tarjeta, fechas, fechasManuales }) => ({
      ...fechas,
      tarjeta: aResumida(tarjeta),
      fechasManuales,
      cuotas: cuotas
        .filter((c) => c.tarjetaId === tarjeta.id && c.periodoResumen === fechas.periodo)
        .map((c) => ({
          compraId: c.compra.id,
          descripcion: c.compra.descripcion,
          fechaCompra: fechaDeDb(c.compra.fecha),
          numero: c.numero,
          cantidadCuotas: c.compra.cantidadCuotas,
          monto: aString2Decimales(c.monto.toString()),
          moneda: c.moneda,
          categoria: c.compra.categoria,
        })),
      saldos: saldos.get(clave(tarjeta.id, fechas.periodo)) ?? [],
      pagos: pagos
        .filter((p) => p.tarjetaId === tarjeta.id && p.periodo === fechas.periodo)
        .map(aPago),
    }));
  }

  /** Cuánto suman las cuotas de los próximos meses, por período, moneda y tarjeta. */
  async compromisos(usuarioId: string, q: CompromisosQuery): Promise<Compromisos> {
    const desde = periodoDe(hoy());
    const hasta = sumarPeriodos(desde, q.meses - 1);
    const [grupos, tarjetas] = await Promise.all([
      this.prisma.cuota.groupBy({
        by: ['tarjetaId', 'periodoResumen', 'moneda'],
        where: { usuarioId, periodoResumen: { gte: desde, lte: hasta } },
        _sum: { monto: true },
      }),
      this.prisma.tarjeta.findMany({ where: { usuarioId }, select: RESUMIDA }),
    ]);
    const porId = new Map(tarjetas.map((t) => [t.id, t]));

    const periodos = Array.from({ length: q.meses }, (_, i) => sumarPeriodos(desde, i)).map(
      (periodo) => {
        const delPeriodo = grupos.filter((g) => g.periodoResumen === periodo);
        const totales = MONEDAS.flatMap((moneda) => {
          const deMoneda = delPeriodo.filter((g) => g.moneda === moneda);
          if (deMoneda.length === 0) return [];
          const total = deMoneda.reduce(
            (acc, g) => acc.plus(g._sum.monto ?? 0),
            new Prisma.Decimal(0),
          );
          return [{ moneda, total: aString2Decimales(total.toString()) }];
        });
        const porTarjeta = delPeriodo
          .flatMap((g) => {
            const t = porId.get(g.tarjetaId);
            return t
              ? [
                  {
                    tarjeta: aResumida(t),
                    moneda: g.moneda,
                    total: aString2Decimales((g._sum.monto ?? 0).toString()),
                  },
                ]
              : [];
          })
          .sort((a, b) =>
            a.moneda !== b.moneda
              ? a.moneda.localeCompare(b.moneda)
              : a.tarjeta.nombre.localeCompare(b.tarjeta.nombre),
          );
        return { periodo, totales, porTarjeta };
      },
    );
    return { desde, hasta, periodos };
  }

  private async obtener(usuarioId: string, id: string): Promise<Tarjeta> {
    const tarjeta = await this.obtenerPropia(usuarioId, id);
    const overrides = (await this.overridesDe([id])).get(id) ?? [];
    const resumen = proximoResumen(hoy(), configDe(tarjeta), overrides);
    const saldos = await this.saldos(usuarioId, [{ tarjetaId: id, periodo: resumen.periodo }]);
    return this.aTarjeta(tarjeta, resumen, saldos.get(clave(id, resumen.periodo)) ?? []);
  }

  /**
   * Total de cuotas y de pagos por (tarjeta, período, moneda), con agregados en SQL.
   * Devuelve un mapa "tarjetaId|periodo" → saldos por moneda (ARS primero).
   */
  private async saldos(
    usuarioId: string,
    pares: { tarjetaId: string; periodo: string }[],
  ): Promise<Map<string, SaldoResumen[]>> {
    const resultado = new Map<string, SaldoResumen[]>();
    if (pares.length === 0) return resultado;
    const [cuotas, pagos] = await Promise.all([
      this.prisma.cuota.groupBy({
        by: ['tarjetaId', 'periodoResumen', 'moneda'],
        where: {
          usuarioId,
          OR: pares.map((p) => ({ tarjetaId: p.tarjetaId, periodoResumen: p.periodo })),
        },
        _sum: { monto: true },
      }),
      this.prisma.pagoResumen.groupBy({
        by: ['tarjetaId', 'periodo', 'moneda'],
        where: { usuarioId, OR: pares },
        _sum: { monto: true },
      }),
    ]);
    for (const { tarjetaId, periodo } of pares) {
      const saldos = MONEDAS.flatMap((moneda: Moneda) => {
        const total = cuotas.find(
          (c) => c.tarjetaId === tarjetaId && c.periodoResumen === periodo && c.moneda === moneda,
        )?._sum.monto;
        const pagado = pagos.find(
          (p) => p.tarjetaId === tarjetaId && p.periodo === periodo && p.moneda === moneda,
        )?._sum.monto;
        if (!total && !pagado) return [];
        const t = aString2Decimales((total ?? 0).toString());
        const p = aString2Decimales((pagado ?? 0).toString());
        const falta = restar(t, p);
        return [
          {
            moneda,
            total: t,
            pagado: p,
            pendiente: comparar(falta, 0) > 0 ? aString2Decimales(falta) : '0.00',
          },
        ];
      });
      resultado.set(clave(tarjetaId, periodo), saldos);
    }
    return resultado;
  }

  private aTarjeta(t: TarjetaDb, resumen: ResumenFechas, saldos: SaldoResumen[]): Tarjeta {
    return {
      ...aResumida(t),
      diaCierre: t.diaCierre,
      diaVencimiento: t.diaVencimiento,
      archivada: t.archivada,
      creadoEn: t.creadoEn.toISOString(),
      proximoResumen: { ...resumen, saldos },
    };
  }
}
