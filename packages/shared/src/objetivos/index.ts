import {
  aString2Decimales,
  comparar,
  dividir,
  esCero,
  restar,
  sumar,
  type ValorDinero,
} from '../dinero';
import { fechaConDia, periodoDe, sumarPeriodos, type Fecha } from '../fechas';

// Cálculo de objetivos de ahorro (ARCHITECTURE §5.1 "Objetivos"). Todo con decimal.js.

/** Meses que se promedian para estimar el ritmo de ahorro cuando no hay uno planeado. */
export const MESES_RITMO = 3;

export interface EntradaAvance {
  montoObjetivo: string;
  /** Suma de todos los aportes (los retiros restan). */
  acumulado: string;
  /** Suma de los aportes del mes actual y los 2 anteriores (para el ritmo de ahorro). */
  aportadoUltimosMeses: string;
  fechaObjetivo?: Fecha | null;
  aporteMensualPlaneado?: string | null;
  hoy: Fecha;
}

export interface Avance {
  acumulado: string;
  /** 0 a 100, con 2 decimales. */
  porcentaje: string;
  /** Lo que falta (nunca negativo). */
  faltante: string;
  /** Meses que quedan hasta la fecha objetivo (0 si ya pasó); null sin fecha. */
  mesesRestantes: number | null;
  /** faltante / meses restantes; null sin fecha o si ya está cumplido. */
  aporteMensualSugerido: string | null;
  /** Ritmo usado para estimar: el planeado o el promedio de los últimos meses. */
  ritmoMensual: string;
  /** Cuándo se llega con ese ritmo; null si ya se llegó o si el ritmo no alcanza (≤ 0). */
  fechaEstimada: Fecha | null;
  /** Llegó, o va a llegar a tiempo (con fecha) o está ahorrando (sin fecha). */
  enCamino: boolean;
}

const max0 = (v: ValorDinero) => (comparar(v, 0) < 0 ? '0.00' : aString2Decimales(v));

/** Meses (enteros) entre el mes de `hoy` y el de `fechaObjetivo`; 0 si ya pasó. */
export function mesesHasta(hoy: Fecha, fechaObjetivo: Fecha): number {
  if (fechaObjetivo < hoy) return 0;
  const [a1, m1] = periodoDe(hoy).split('-').map(Number) as [number, number];
  const [a2, m2] = periodoDe(fechaObjetivo).split('-').map(Number) as [number, number];
  return Math.max((a2 - a1) * 12 + (m2 - m1), 1);
}

export function calcularAvance(e: EntradaAvance): Avance {
  const acumulado = aString2Decimales(e.acumulado);
  const faltante = max0(restar(e.montoObjetivo, acumulado));
  const cumplido = esCero(faltante);
  const pct = dividir(acumulado, e.montoObjetivo).times(100);
  const porcentaje = comparar(pct, 100) > 0 ? '100.00' : max0(pct);

  const mesesRestantes = e.fechaObjetivo ? mesesHasta(e.hoy, e.fechaObjetivo) : null;
  const aporteMensualSugerido =
    mesesRestantes === null || cumplido
      ? null
      : aString2Decimales(dividir(faltante, Math.max(mesesRestantes, 1)));

  const ritmoMensual = aString2Decimales(
    e.aporteMensualPlaneado ?? dividir(e.aportadoUltimosMeses, MESES_RITMO),
  );
  let fechaEstimada: Fecha | null = null;
  if (!cumplido && comparar(ritmoMensual, 0) > 0) {
    const meses = Math.ceil(Number(dividir(faltante, ritmoMensual).toFixed(6)));
    fechaEstimada = fechaConDia(sumarPeriodos(periodoDe(e.hoy), meses), Number(e.hoy.slice(8, 10)));
  }

  const enCamino = cumplido
    ? true
    : e.fechaObjetivo
      ? fechaEstimada !== null && fechaEstimada <= e.fechaObjetivo
      : comparar(ritmoMensual, 0) > 0;

  return {
    acumulado,
    porcentaje,
    faltante,
    mesesRestantes,
    aporteMensualSugerido,
    ritmoMensual,
    fechaEstimada,
    enCamino,
  };
}

/**
 * A partir de la lista de aportes: el acumulado y lo aportado en el mes de `hoy` y los
 * dos anteriores. La API lo calcula con agregados en SQL; esto es para el front y tests.
 */
export function resumirAportes(
  aportes: { monto: string; fecha: Fecha }[],
  hoy: Fecha,
): { acumulado: string; aportadoUltimosMeses: string } {
  const desde = `${sumarPeriodos(periodoDe(hoy), -(MESES_RITMO - 1))}-01`;
  const recientes = aportes.filter((a) => a.fecha >= desde && a.fecha <= hoy);
  return {
    acumulado: aString2Decimales(sumar(0, ...aportes.map((a) => a.monto))),
    aportadoUltimosMeses: aString2Decimales(sumar(0, ...recientes.map((a) => a.monto))),
  };
}

/** Desde qué fecha cuentan los aportes para el ritmo (primer día de hace 2 meses). */
export const inicioRitmo = (hoy: Fecha): Fecha =>
  `${sumarPeriodos(periodoDe(hoy), -(MESES_RITMO - 1))}-01`;
