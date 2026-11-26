import { Injectable } from '@nestjs/common';
import {
  aString2Decimales,
  comparar,
  MONEDAS,
  type Moneda,
  porcentaje,
  restar,
  sumar,
  variacionPorcentual,
} from '@efe/shared/dinero';
import {
  hoy,
  type Periodo,
  periodoDe,
  periodosEntre,
  rangoDePeriodo,
  sumarPeriodos,
} from '@efe/shared/fechas';
import type {
  Evolucion,
  GastoPorCategoria,
  PuntoEvolucion,
  ResumenMensual,
  ResumenMoneda,
} from '@efe/shared/schemas';
import { Prisma } from '@prisma/client';
import { fechaADb } from '../../common/fechas';
import { PrismaService } from '../../prisma/prisma.service';

type Monto = Prisma.Decimal | string | null | undefined;
const s = (v: Monto) => aString2Decimales(v == null ? '0' : v.toString());
/** Monedas presentes, en el orden de MONEDAS (ARS primero). */
const ordenarMonedas = (monedas: Iterable<Moneda>) => {
  const presentes = new Set(monedas);
  return MONEDAS.filter((m) => presentes.has(m));
};

interface TotalesMes {
  ingresos: string;
  gastosMovimientos: string;
  gastosTarjeta: string;
}

const TOTALES_VACIOS: TotalesMes = { ingresos: '0', gastosMovimientos: '0', gastosTarjeta: '0' };

/**
 * Resumen y evolución mensual. Todo se agrega en SQL (groupBy o $queryRaw con GROUP BY):
 * nunca se traen movimientos ni cuotas para sumar en memoria; acá solo se combinan los
 * grupos (pocas filas: moneda × tipo, moneda × categoría, mes × moneda).
 *
 * Índices que usan estas consultas (ya existen en el schema):
 * - movimientos (usuarioId, fecha): totales por mes y la serie de evolución.
 * - movimientos (usuarioId, categoriaId, fecha): gastos por categoría.
 * - cuotas (usuarioId, periodoResumen): cuotas del mes y de la serie.
 */
@Injectable()
export class ResumenService {
  constructor(private readonly prisma: PrismaService) {}

  async mensual(usuarioId: string, periodoPedido?: Periodo): Promise<ResumenMensual> {
    const periodo = periodoPedido ?? periodoDe(hoy());
    const anterior = sumarPeriodos(periodo, -1);

    const [actual, previo, porCategoria] = await Promise.all([
      this.totalesPorMoneda(usuarioId, periodo),
      this.totalesPorMoneda(usuarioId, anterior),
      this.gastosPorCategoria(usuarioId, periodo),
    ]);

    const monedas: ResumenMoneda[] = ordenarMonedas(actual.keys()).map((moneda) => {
      const t = actual.get(moneda) ?? TOTALES_VACIOS;
      const p = previo.get(moneda) ?? TOTALES_VACIOS;
      const gastos = sumar(t.gastosMovimientos, t.gastosTarjeta);
      const gastosAnterior = sumar(p.gastosMovimientos, p.gastosTarjeta);
      return {
        moneda,
        ingresos: s(t.ingresos),
        gastos: s(gastos.toString()),
        saldo: s(restar(t.ingresos, gastos).toString()),
        porcentajeGastado: porcentaje(gastos, t.ingresos),
        gastosMovimientos: s(t.gastosMovimientos),
        gastosTarjeta: s(t.gastosTarjeta),
        porCategoria: (porCategoria.get(moneda) ?? []).map((c) => ({
          ...c,
          porcentaje: porcentaje(c.total, gastos),
        })),
        comparacionMesAnterior: {
          ingresosAnterior: s(p.ingresos),
          gastosAnterior: s(gastosAnterior.toString()),
          variacionIngresos: variacionPorcentual(t.ingresos, p.ingresos),
          variacionGastos: variacionPorcentual(gastos, gastosAnterior),
        },
      };
    });

    return { periodo, monedas };
  }

  async evolucion(usuarioId: string, meses: number, hastaPedido?: Periodo): Promise<Evolucion> {
    const hasta = hastaPedido ?? periodoDe(hoy());
    const desde = sumarPeriodos(hasta, -(meses - 1));
    const periodos = periodosEntre(desde, hasta);

    const [movimientos, cuotas] = await Promise.all([
      this.prisma.$queryRaw<
        { periodo: string; moneda: Moneda; tipo: 'INGRESO' | 'GASTO'; total: Prisma.Decimal }[]
      >`
        SELECT to_char(fecha, 'YYYY-MM') AS periodo, moneda::text AS moneda, tipo::text AS tipo,
               SUM(monto) AS total
        FROM movimientos
        WHERE "usuarioId" = ${usuarioId}
          AND fecha >= ${rangoDePeriodo(desde).desde}::date
          AND fecha <= ${rangoDePeriodo(hasta).hasta}::date
        GROUP BY 1, 2, 3
      `,
      this.prisma.$queryRaw<{ periodo: string; moneda: Moneda; total: Prisma.Decimal }[]>`
        SELECT "periodoResumen" AS periodo, moneda::text AS moneda, SUM(monto) AS total
        FROM cuotas
        WHERE "usuarioId" = ${usuarioId}
          AND "periodoResumen" >= ${desde} AND "periodoResumen" <= ${hasta}
        GROUP BY 1, 2
      `,
    ]);

    // moneda → periodo → totales
    const datos = new Map<Moneda, Map<string, TotalesMes>>();
    const celda = (moneda: Moneda, periodo: string) => {
      const porMes = datos.get(moneda) ?? new Map<string, TotalesMes>();
      datos.set(moneda, porMes);
      const t = porMes.get(periodo) ?? { ...TOTALES_VACIOS };
      porMes.set(periodo, t);
      return t;
    };
    for (const m of movimientos) {
      const t = celda(m.moneda, m.periodo);
      if (m.tipo === 'INGRESO') t.ingresos = m.total.toString();
      else t.gastosMovimientos = m.total.toString();
    }
    for (const c of cuotas) celda(c.moneda, c.periodo).gastosTarjeta = c.total.toString();

    return {
      desde,
      hasta,
      monedas: ordenarMonedas(datos.keys()).map((moneda) => ({
        moneda,
        meses: periodos.map((periodo): PuntoEvolucion => {
          const t = datos.get(moneda)?.get(periodo) ?? TOTALES_VACIOS;
          const gastos = sumar(t.gastosMovimientos, t.gastosTarjeta);
          return {
            periodo,
            ingresos: s(t.ingresos),
            gastos: s(gastos.toString()),
            gastosMovimientos: s(t.gastosMovimientos),
            gastosTarjeta: s(t.gastosTarjeta),
            saldo: s(restar(t.ingresos, gastos).toString()),
          };
        }),
      })),
    };
  }

  /** Ingresos, gastos en movimientos y cuotas del período, por moneda (solo monedas con datos). */
  private async totalesPorMoneda(usuarioId: string, periodo: Periodo) {
    const { desde, hasta } = rangoDePeriodo(periodo);
    const [movimientos, cuotas] = await Promise.all([
      this.prisma.movimiento.groupBy({
        by: ['moneda', 'tipo'],
        where: { usuarioId, fecha: { gte: fechaADb(desde), lte: fechaADb(hasta) } },
        _sum: { monto: true },
      }),
      this.prisma.cuota.groupBy({
        by: ['moneda'],
        where: { usuarioId, periodoResumen: periodo },
        _sum: { monto: true },
      }),
    ]);
    const totales = new Map<Moneda, TotalesMes>();
    const de = (moneda: Moneda) => {
      const t = totales.get(moneda) ?? { ...TOTALES_VACIOS };
      totales.set(moneda, t);
      return t;
    };
    for (const m of movimientos) {
      const monto = (m._sum.monto ?? '0').toString();
      if (m.tipo === 'INGRESO') de(m.moneda).ingresos = monto;
      else de(m.moneda).gastosMovimientos = monto;
    }
    for (const c of cuotas) de(c.moneda).gastosTarjeta = (c._sum.monto ?? '0').toString();
    return totales;
  }

  /** Gastos del período por moneda y categoría (movimientos GASTO + cuotas por la categoría de su compra). */
  private async gastosPorCategoria(usuarioId: string, periodo: Periodo) {
    const { desde, hasta } = rangoDePeriodo(periodo);
    const [movimientos, cuotas] = await Promise.all([
      this.prisma.movimiento.groupBy({
        by: ['moneda', 'categoriaId'],
        where: {
          usuarioId,
          tipo: 'GASTO',
          fecha: { gte: fechaADb(desde), lte: fechaADb(hasta) },
        },
        _sum: { monto: true },
      }),
      this.prisma.$queryRaw<
        { moneda: Moneda; categoriaId: string | null; total: Prisma.Decimal }[]
      >`
        SELECT cu.moneda::text AS moneda, c."categoriaId" AS "categoriaId", SUM(cu.monto) AS total
        FROM cuotas cu
        JOIN compras_tarjeta c ON c.id = cu."compraId"
        WHERE cu."usuarioId" = ${usuarioId} AND cu."periodoResumen" = ${periodo}
        GROUP BY 1, 2
      `,
    ]);

    // moneda → categoriaId → total
    const totales = new Map<Moneda, Map<string | null, string>>();
    const acumular = (moneda: Moneda, categoriaId: string | null, monto: Monto) => {
      const porCat = totales.get(moneda) ?? new Map<string | null, string>();
      totales.set(moneda, porCat);
      porCat.set(categoriaId, sumar(porCat.get(categoriaId) ?? '0', s(monto)).toString());
    };
    for (const m of movimientos) acumular(m.moneda, m.categoriaId, m._sum.monto);
    for (const c of cuotas) acumular(c.moneda, c.categoriaId, c.total);

    const ids = [...new Set([...totales.values()].flatMap((m) => [...m.keys()]))].filter(
      (id): id is string => id !== null,
    );
    const categorias = new Map(
      (
        await this.prisma.categoria.findMany({
          where: { usuarioId, id: { in: ids } },
          select: { id: true, nombre: true, color: true, icono: true },
        })
      ).map((c) => [c.id, c]),
    );

    const resultado = new Map<Moneda, Omit<GastoPorCategoria, 'porcentaje'>[]>();
    for (const [moneda, porCat] of totales) {
      const filas = [...porCat].map(([categoriaId, total]) => {
        const c = categoriaId ? categorias.get(categoriaId) : undefined;
        return {
          categoriaId,
          nombre: c?.nombre ?? 'Sin categoría',
          color: c?.color ?? null,
          icono: c?.icono ?? null,
          total: s(total),
        };
      });
      filas.sort((x, y) => comparar(y.total, x.total) || x.nombre.localeCompare(y.nombre, 'es'));
      resultado.set(moneda, filas);
    }
    return resultado;
  }
}
