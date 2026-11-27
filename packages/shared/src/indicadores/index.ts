import Decimal from 'decimal.js';
import { aString2Decimales, comparar, dinero, dividir, esCero, type ValorDinero } from '../dinero';

// Indicadores económicos (ARCHITECTURE §7): códigos y cálculos derivados.

export const CODIGOS_INDICADOR = [
  'DOLAR_OFICIAL_COMPRA',
  'DOLAR_OFICIAL_VENTA',
  'DOLAR_MEP_COMPRA',
  'DOLAR_MEP_VENTA',
  'DOLAR_CCL_COMPRA',
  'DOLAR_CCL_VENTA',
  'IPC_MENSUAL',
] as const;
export type CodigoIndicador = (typeof CODIGOS_INDICADOR)[number];

export const esCodigoIndicador = (v: string): v is CodigoIndicador =>
  (CODIGOS_INDICADOR as readonly string[]).includes(v);

/** Fuente de las correcciones hechas a mano desde el admin. */
export const FUENTE_MANUAL = 'Carga manual EFE';

/**
 * Brecha de un dólar contra el oficial, en %: brecha('1500', '1000') → "50.00".
 * Se calcula con los precios de venta. null si el oficial es cero.
 */
export function brecha(dolar: ValorDinero, oficial: ValorDinero): string | null {
  if (esCero(oficial)) return null;
  return aString2Decimales(dividir(dolar, oficial).minus(1).times(100));
}

/**
 * Inflación acumulada a partir de las mensuales (en %): producto de (1 + m/100) − 1.
 * ipcAcumulado(['2', '3']) → "5.06". Lista vacía → "0.00".
 */
export function ipcAcumulado(mensuales: ValorDinero[]): string {
  const factor = mensuales.reduce<Decimal>(
    (acc, m) => acc.times(dinero(m).dividedBy(100).plus(1)),
    dinero(1),
  );
  return aString2Decimales(factor.minus(1).times(100));
}

/**
 * Valor de un indicador como string decimal con hasta 6 decimales (lo que guarda la
 * columna `Decimal(18, 6)`), a partir del número que manda una fuente externa.
 */
export function valorIndicador(valor: number | string): string {
  if (typeof valor === 'number' && !Number.isFinite(valor)) {
    throw new RangeError(`Valor de indicador inválido: ${valor}`);
  }
  const d = dinero(valor);
  return d.toDecimalPlaces(6, Decimal.ROUND_HALF_UP).toFixed();
}

/** true si el valor es positivo (un precio de 0 o negativo es un dato roto). */
export const esPrecioValido = (valor: ValorDinero) => comparar(valor, 0) > 0;
