import { Prisma } from '@prisma/client';

/**
 * Formatea un Decimal de Prisma como string con al menos 2 decimales:
 * montos de `Decimal(18, 2)` → "1234.50"; valores con más precisión (indicadores,
 * `Decimal(18, 6)`) conservan sus decimales: "1234.567".
 */
export function decimalAString(valor: Prisma.Decimal): string {
  return valor.toFixed(Math.max(2, valor.decimalPlaces()));
}

/**
 * Recorre la respuesta y reemplaza cada Prisma.Decimal por su string. El toJSON de
 * Decimal no fija decimales ("1234.5"), por eso se hace acá y no se confía en él.
 * Las fechas, null y primitivos quedan igual.
 */
export function serializarDecimales(valor: unknown): unknown {
  if (valor === null || typeof valor !== 'object') return valor;
  if (Prisma.Decimal.isDecimal(valor)) return decimalAString(valor as Prisma.Decimal);
  if (valor instanceof Date) return valor;
  if (Array.isArray(valor)) return valor.map(serializarDecimales);
  const proto = Object.getPrototypeOf(valor) as unknown;
  if (proto !== Object.prototype && proto !== null) return valor;
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).map(([k, v]) => [k, serializarDecimales(v)]),
  );
}
