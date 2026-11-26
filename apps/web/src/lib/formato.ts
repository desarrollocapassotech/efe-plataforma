import { comparar, dinero, formatearMoneda, type Moneda } from '@efe/shared/dinero';

const SIMBOLO: Record<Moneda, string> = { ARS: '$', USD: 'US$' };
const NBSP = '\u00a0';

/**
 * Monto abreviado para ejes y lugares chicos: "$ 1,2 M", "$ 850 mil", "$ 950".
 * Solo para mostrar (redondea): los montos exactos se ven en la lista o la tabla.
 */
export function montoCompacto(valor: string | number, moneda: Moneda): string {
  const v = dinero(valor);
  const abs = v.abs();
  const signo = v.isNegative() && !v.isZero() ? '-' : '';
  let numero: string;
  if (comparar(abs, 1_000_000) >= 0) {
    numero = `${abs.div(1_000_000).toDecimalPlaces(1).toString().replace('.', ',')}${NBSP}M`;
  } else if (comparar(abs, 1_000) >= 0) {
    numero = `${abs.div(1_000).toDecimalPlaces(0).toString()}${NBSP}mil`;
  } else {
    return formatearMoneda(valor, moneda, { decimales: 0 });
  }
  return `${signo}${SIMBOLO[moneda]}${NBSP}${numero}`;
}

/** "46 %" a partir de "46.15" (sin decimales: es para leer de un vistazo). */
export function porcentajeRedondo(valor: string): string {
  return `${dinero(valor).toDecimalPlaces(0).toString()}${NBSP}%`;
}
