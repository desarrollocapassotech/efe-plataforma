import { aString2Decimales, esCero, multiplicar } from '@efe/shared/dinero';
import type { Periodo } from '@efe/shared/fechas';
import {
  generarCuotas,
  resumenDelPeriodo,
  type ConfigTarjeta,
  type CuotaCalculada,
  type Resumen,
} from '@efe/shared/tarjetas';

export interface VistaPrevia {
  primera: Resumen;
  ultimoPeriodo: Periodo;
  cuotas: CuotaCalculada[];
}

/**
 * En qué resúmenes cae una compra, calculado en el navegador con la misma lógica que la
 * API (@efe/shared/tarjetas). No conoce las fechas corregidas a mano: es una vista previa.
 * null si todavía faltan datos.
 */
export function vistaPrevia(
  compra: { fecha: string; montoTotal: string; cantidadCuotas: number },
  tarjeta: ConfigTarjeta,
): VistaPrevia | null {
  if (!compra.montoTotal || esCero(compra.montoTotal) || compra.cantidadCuotas < 1) return null;
  try {
    const cuotas = generarCuotas(compra, tarjeta);
    const primera = resumenDelPeriodo(cuotas[0]!.periodoResumen, tarjeta);
    return { primera, ultimoPeriodo: cuotas.at(-1)!.periodoResumen, cuotas };
  } catch {
    return null;
  }
}

/** Total de la compra a partir del valor de cada cuota. */
export const totalDesdeCuota = (montoCuota: string, cantidad: number) =>
  aString2Decimales(multiplicar(montoCuota, cantidad));
