import { type Fecha, fechaConDia, type Periodo, periodoDe, sumarPeriodos } from '../fechas';

export const FRECUENCIAS = ['MENSUAL', 'ANUAL'] as const;
export type Frecuencia = (typeof FRECUENCIAS)[number];

/** Regla de una recurrencia (ingreso o gasto fijo). */
export interface ReglaRecurrencia {
  frecuencia: Frecuencia;
  /** 1..31; en meses más cortos se usa el último día (31 → 30, 28 o 29). */
  diaDelMes: number;
  /** 1..12, solo ANUAL. */
  mesDelAnio?: number | null;
  /** Primera fecha posible (las ocurrencias anteriores no cuentan). */
  desde: Fecha;
  /** Última fecha posible, incluida. */
  hasta?: Fecha | null;
}

export interface Ocurrencia {
  /** YYYY-MM al que corresponde (clave de idempotencia con la recurrencia). */
  periodo: Periodo;
  fecha: Fecha;
}

const mesDe = (periodo: Periodo) => Number(periodo.slice(5, 7));

function validar(regla: ReglaRecurrencia): void {
  if (!Number.isInteger(regla.diaDelMes) || regla.diaDelMes < 1 || regla.diaDelMes > 31) {
    throw new RangeError(`diaDelMes inválido: ${regla.diaDelMes}`);
  }
  if (regla.frecuencia === 'ANUAL') {
    const mes = regla.mesDelAnio;
    if (mes == null || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new RangeError(`mesDelAnio inválido para una recurrencia anual: ${String(mes)}`);
    }
  }
}

/** Primer período >= `desde` en el que la regla tiene ocurrencia. */
function primerPeriodoCandidato(regla: ReglaRecurrencia, desde: Periodo): Periodo {
  if (regla.frecuencia === 'MENSUAL') return desde;
  const objetivo = regla.mesDelAnio as number;
  const diferencia = (objetivo - mesDe(desde) + 12) % 12;
  return sumarPeriodos(desde, diferencia);
}

const paso = (regla: ReglaRecurrencia) => (regla.frecuencia === 'MENSUAL' ? 1 : 12);

/**
 * Ocurrencias de la regla con fecha entre `regla.desde` y min(`regla.hasta`, `limite`),
 * ambas incluidas, y con período posterior a `despuesDePeriodo` (el último ya generado).
 * Ordenadas por fecha.
 *
 * Ej.: mensual el 31, desde 2026-01-15, límite 2026-04-10 →
 *   2026-01-31, 2026-02-28, 2026-03-31 (abril cae el 30, después del límite).
 */
export function ocurrenciasRecurrencia(
  regla: ReglaRecurrencia,
  limite: Fecha,
  despuesDePeriodo?: Periodo | null,
): Ocurrencia[] {
  validar(regla);
  const tope = regla.hasta && regla.hasta < limite ? regla.hasta : limite;
  if (tope < regla.desde) return [];

  let inicio = periodoDe(regla.desde);
  if (despuesDePeriodo && despuesDePeriodo >= inicio) inicio = sumarPeriodos(despuesDePeriodo, 1);

  const resultado: Ocurrencia[] = [];
  const ultimoPeriodo = periodoDe(tope);
  for (
    let p = primerPeriodoCandidato(regla, inicio);
    p <= ultimoPeriodo;
    p = sumarPeriodos(p, paso(regla))
  ) {
    const fecha = fechaConDia(p, regla.diaDelMes);
    if (fecha >= regla.desde && fecha <= tope) resultado.push({ periodo: p, fecha });
  }
  return resultado;
}

/**
 * Próxima ocurrencia con fecha >= `desdeFecha` (normalmente hoy) que todavía no se
 * generó (período posterior a `despuesDePeriodo`). null si la regla ya terminó.
 */
export function proximaOcurrencia(
  regla: ReglaRecurrencia,
  desdeFecha: Fecha,
  despuesDePeriodo?: Periodo | null,
): Ocurrencia | null {
  validar(regla);
  const piso = regla.desde > desdeFecha ? regla.desde : desdeFecha;
  let inicio = periodoDe(piso);
  if (despuesDePeriodo && despuesDePeriodo >= inicio) inicio = sumarPeriodos(despuesDePeriodo, 1);

  // Alcanza con mirar dos ciclos: en el primero puede caer antes de `piso`.
  let p = primerPeriodoCandidato(regla, inicio);
  for (let i = 0; i < 2; i++, p = sumarPeriodos(p, paso(regla))) {
    const fecha = fechaConDia(p, regla.diaDelMes);
    if (regla.hasta && fecha > regla.hasta) return null;
    if (fecha >= piso) return { periodo: p, fecha };
  }
  return null;
}
