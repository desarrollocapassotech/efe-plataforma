import { aString2Decimales, dividir, esCero, multiplicar, sumar } from '@efe/shared/dinero';
import type { PuntoEvolucion } from '@efe/shared/schemas';

export type ClavePlantilla =
  'auto' | 'viaje' | 'vivienda' | 'emergencia' | 'proyecto' | 'patrimonio' | 'otro';

/** Plantillas para arrancar un objetivo sin pensar mucho (nombre e ícono sugeridos). */
export const PLANTILLAS: { clave: ClavePlantilla; nombre: string; icono: string; ayuda: string }[] =
  [
    { clave: 'emergencia', nombre: 'Fondo de emergencia', icono: '🛟', ayuda: 'Por si pasa algo' },
    { clave: 'viaje', nombre: 'Viaje', icono: '✈️', ayuda: 'Vacaciones, escapadas' },
    { clave: 'auto', nombre: 'Auto', icono: '🚗', ayuda: 'Comprar o cambiar el auto' },
    { clave: 'vivienda', nombre: 'Vivienda', icono: '🏠', ayuda: 'Casa, depto, refacción' },
    { clave: 'proyecto', nombre: 'Proyecto', icono: '🚀', ayuda: 'Un emprendimiento, un curso' },
    { clave: 'patrimonio', nombre: 'Patrimonio', icono: '📈', ayuda: 'Ahorrar e invertir' },
    { clave: 'otro', nombre: 'Otro', icono: '🎯', ayuda: 'Lo que quieras' },
  ];

/**
 * Gasto mensual promedio de los meses cerrados con gastos (el mes en curso no cuenta: está
 * incompleto). null si no hay meses con gastos.
 */
export function gastoPromedio(meses: PuntoEvolucion[], mesActual: string): string | null {
  const cerrados = meses.filter((m) => m.periodo < mesActual && !esCero(m.gastos));
  if (cerrados.length === 0) return null;
  return aString2Decimales(dividir(sumar(...cerrados.map((m) => m.gastos)), cerrados.length));
}

/** Fondo de emergencia sugerido: de 3 a 6 meses de gastos. */
export const fondoSugerido = (promedio: string, meses: 3 | 6) =>
  aString2Decimales(multiplicar(promedio, meses));
