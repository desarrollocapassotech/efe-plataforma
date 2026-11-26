import Decimal from 'decimal.js';

/** Monedas soportadas. Alineado con el enum `Moneda` de Prisma. */
export const MONEDAS = ['ARS', 'USD'] as const;
export type Moneda = (typeof MONEDAS)[number];

/**
 * Constructor de Decimal propio (no toca la configuración global de decimal.js).
 * Precisión de sobra para montos de `Decimal(18, 2)` y redondeo comercial (half up).
 */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

/** Valor monetario en memoria. En JSON y en la base viaja como string. */
export type Dinero = Decimal;
export type ValorDinero = string | number | Decimal;

/**
 * Crea un Dinero a partir de un string decimal ("1234.5"), un number o un Decimal.
 * Preferí strings: un number puede traer error de punto flotante.
 */
export function dinero(valor: ValorDinero): Dinero {
  if (typeof valor === 'string' && valor.trim() === '') {
    throw new RangeError('Monto vacío');
  }
  let d: Decimal;
  try {
    d = new D(valor);
  } catch {
    throw new RangeError(`Monto inválido: ${String(valor)}`);
  }
  if (!d.isFinite()) throw new RangeError(`Monto inválido: ${String(valor)}`);
  return d;
}

export function sumar(...valores: ValorDinero[]): Dinero {
  return valores.reduce<Decimal>((acc, v) => acc.plus(dinero(v)), new D(0));
}

export function restar(a: ValorDinero, b: ValorDinero): Dinero {
  return dinero(a).minus(dinero(b));
}

export function multiplicar(a: ValorDinero, b: ValorDinero): Dinero {
  return dinero(a).times(dinero(b));
}

export function dividir(a: ValorDinero, b: ValorDinero): Dinero {
  const divisor = dinero(b);
  if (divisor.isZero()) throw new RangeError('División por cero');
  return dinero(a).dividedBy(divisor);
}

export function esCero(valor: ValorDinero): boolean {
  return dinero(valor).isZero();
}

/** -1 si a < b, 0 si son iguales, 1 si a > b. */
export function comparar(a: ValorDinero, b: ValorDinero): -1 | 0 | 1 {
  return dinero(a).comparedTo(dinero(b)) as -1 | 0 | 1;
}

/** Redondea a centavos (half up) y devuelve siempre 2 decimales: "1234.50". Nunca "-0.00". */
export function aString2Decimales(valor: ValorDinero): string {
  const redondeado = dinero(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return redondeado.isZero() ? '0.00' : redondeado.toFixed(2);
}

const MONTO_2_DECIMALES = /^\d+(\.\d{1,2})?$/;

/**
 * Divide un total en cuotas: cada cuota es total / cantidad truncado a centavos y
 * la última absorbe la diferencia, así la suma es exactamente el total.
 *
 * dividirEnCuotas('100.00', 3) → ['33.33', '33.33', '33.34']
 */
export function dividirEnCuotas(total: string, cantidad: number): string[] {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new RangeError(`Cantidad de cuotas inválida: ${cantidad}`);
  }
  if (!MONTO_2_DECIMALES.test(total)) {
    throw new RangeError(`Total inválido (string no negativo con hasta 2 decimales): ${total}`);
  }
  const t = dinero(total);
  const cuota = t.dividedBy(cantidad).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const ultima = t.minus(cuota.times(cantidad - 1));
  const cuotas = Array.from({ length: cantidad - 1 }, () => cuota.toFixed(2));
  cuotas.push(ultima.toFixed(2));
  return cuotas;
}

export interface OpcionesFormato {
  /** Cantidad de decimales a mostrar (default 2). */
  decimales?: 0 | 2;
  /** Mostrar "+" en montos positivos (útil para variaciones). Default false. */
  signo?: boolean;
}

const SIMBOLOS: Record<Moneda, string> = { ARS: '$', USD: 'US$' };
/** Espacio no separable entre símbolo y número (igual que Intl es-AR): no se corta en dos líneas. */
const NBSP = ' ';

/**
 * Formato es-AR, determinístico (no depende de los datos ICU del runtime):
 * formatearMoneda('1234.5', 'ARS') → "$ 1.234,50"; con USD → "US$ 1.234,50"; negativos "-$ 1.234,50".
 * El espacio es U+00A0.
 */
export function formatearMoneda(
  valor: ValorDinero,
  moneda: Moneda,
  opciones: OpcionesFormato = {},
): string {
  const decimales = opciones.decimales ?? 2;
  const redondeado = dinero(valor).toDecimalPlaces(decimales, Decimal.ROUND_HALF_UP);
  const [entera = '0', fraccion] = redondeado.abs().toFixed(decimales).split('.');
  const enteraAgrupada = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const numero = fraccion ? `${enteraAgrupada},${fraccion}` : enteraAgrupada;

  let prefijoSigno = '';
  if (redondeado.isNegative() && !redondeado.isZero()) prefijoSigno = '-';
  else if (opciones.signo && redondeado.isPositive() && !redondeado.isZero()) prefijoSigno = '+';

  return `${prefijoSigno}${SIMBOLOS[moneda]}${NBSP}${numero}`;
}
