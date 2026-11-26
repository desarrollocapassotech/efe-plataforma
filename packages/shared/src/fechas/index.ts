/**
 * Fechas de negocio como strings `YYYY-MM-DD` y períodos `YYYY-MM`.
 *
 * Todo se calcula con aritmética de enteros (y `Date.UTC` donde hace falta), nunca con
 * la zona horaria del proceso: el mismo input da el mismo output en el servidor (UTC)
 * y en el celular del usuario.
 */

/** Fecha de negocio `YYYY-MM-DD`. */
export type Fecha = string;
/** Período mensual `YYYY-MM`. */
export type Periodo = string;

export const ZONA_HORARIA_AR = 'America/Argentina/Buenos_Aires';

/** Date.UTC interpreta los años 0–99 como 1900–1999: no se aceptan fechas anteriores. */
const ANIO_MINIMO = 1900;

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_PERIODO = /^(\d{4})-(\d{2})$/;

const pad2 = (n: number) => String(n).padStart(2, '0');
const pad4 = (n: number) => String(n).padStart(4, '0');

function partesPeriodo(periodo: Periodo): { anio: number; mes: number } {
  const m = RE_PERIODO.exec(periodo);
  const anio = Number(m?.[1]);
  const mes = Number(m?.[2]);
  if (!m || anio < ANIO_MINIMO || mes < 1 || mes > 12) {
    throw new RangeError(`Período inválido (se espera YYYY-MM): ${periodo}`);
  }
  return { anio, mes };
}

function partesFecha(fecha: Fecha): { anio: number; mes: number; dia: number } {
  const m = RE_FECHA.exec(fecha);
  const anio = Number(m?.[1]);
  const mes = Number(m?.[2]);
  const dia = Number(m?.[3]);
  if (!m || anio < ANIO_MINIMO || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) {
    throw new RangeError(`Fecha inválida (se espera YYYY-MM-DD): ${fecha}`);
  }
  return { anio, mes, dia };
}

function diasDelMes(anio: number, mes: number): number {
  // Día 0 del mes siguiente = último día de este mes. En UTC no hay DST.
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

const aPeriodo = (anio: number, mes: number): Periodo => `${pad4(anio)}-${pad2(mes)}`;

export function esPeriodoValido(valor: string): boolean {
  try {
    partesPeriodo(valor);
    return true;
  } catch {
    return false;
  }
}

export function esFechaValida(valor: string): boolean {
  try {
    partesFecha(valor);
    return true;
  } catch {
    return false;
  }
}

/** Cantidad de días del período (28 a 31). */
export function diasEnPeriodo(periodo: Periodo): number {
  const { anio, mes } = partesPeriodo(periodo);
  return diasDelMes(anio, mes);
}

/** Período al que pertenece una fecha: '2026-03-15' → '2026-03'. */
export function periodoDe(fecha: Fecha): Periodo {
  const { anio, mes } = partesFecha(fecha);
  return aPeriodo(anio, mes);
}

/** Suma (o resta, con n negativo) meses a un período: sumarPeriodos('2026-11', 3) → '2027-02'. */
export function sumarPeriodos(periodo: Periodo, n: number): Periodo {
  if (!Number.isInteger(n)) throw new RangeError(`Cantidad de meses inválida: ${n}`);
  const { anio, mes } = partesPeriodo(periodo);
  const total = anio * 12 + (mes - 1) + n;
  return aPeriodo(Math.floor(total / 12), (total % 12) + 1);
}

/** Primer y último día del período: '2028-02' → { desde: '2028-02-01', hasta: '2028-02-29' }. */
export function rangoDePeriodo(periodo: Periodo): { desde: Fecha; hasta: Fecha } {
  const { anio, mes } = partesPeriodo(periodo);
  return {
    desde: `${aPeriodo(anio, mes)}-01`,
    hasta: `${aPeriodo(anio, mes)}-${pad2(diasDelMes(anio, mes))}`,
  };
}

/** Períodos de `desde` a `hasta`, ambos incluidos, en orden. Si desde > hasta devuelve []. */
export function periodosEntre(desde: Periodo, hasta: Periodo): Periodo[] {
  partesPeriodo(desde);
  partesPeriodo(hasta);
  const resultado: Periodo[] = [];
  for (let p = desde; p <= hasta; p = sumarPeriodos(p, 1)) resultado.push(p);
  return resultado;
}

/**
 * Fecha del período con ese día, recortado al último día del mes:
 * fechaConDia('2028-02', 31) → '2028-02-29'; fechaConDia('2026-04', 31) → '2026-04-30'.
 */
export function fechaConDia(periodo: Periodo, dia: number): Fecha {
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new RangeError(`Día inválido (1 a 31): ${dia}`);
  }
  const { anio, mes } = partesPeriodo(periodo);
  return `${aPeriodo(anio, mes)}-${pad2(Math.min(dia, diasDelMes(anio, mes)))}`;
}

/** Suma (o resta) días a una fecha: sumarDias('2028-02-28', 1) → '2028-02-29'. */
export function sumarDias(fecha: Fecha, n: number): Fecha {
  if (!Number.isInteger(n)) throw new RangeError(`Cantidad de días inválida: ${n}`);
  const { anio, mes, dia } = partesFecha(fecha);
  const d = new Date(Date.UTC(anio, mes - 1, dia + n));
  return `${aPeriodo(d.getUTCFullYear(), d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** -1, 0 o 1. Las fechas válidas `YYYY-MM-DD` se ordenan bien como strings. */
export function compararFechas(a: Fecha, b: Fecha): -1 | 0 | 1 {
  partesFecha(a);
  partesFecha(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Fecha de hoy en una zona horaria explícita (default Argentina), sin importar la
 * zona del proceso. `ahora` se puede inyectar para tests.
 */
export function hoy(zonaHoraria: string = ZONA_HORARIA_AR, ahora: Date = new Date()): Fecha {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}
