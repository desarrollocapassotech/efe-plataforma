import type { RedTarjeta } from '@efe/shared/schemas';

/** Redes de tarjeta con su nombre visible. */
export const REDES: { red: RedTarjeta; nombre: string }[] = [
  { red: 'VISA', nombre: 'Visa' },
  { red: 'MASTERCARD', nombre: 'Mastercard' },
  { red: 'AMEX', nombre: 'American Express' },
  { red: 'CABAL', nombre: 'Cabal' },
  { red: 'NARANJA', nombre: 'Naranja' },
  { red: 'OTRA', nombre: 'Otra' },
];

export const nombreRed = (red: RedTarjeta) => REDES.find((r) => r.red === red)?.nombre ?? 'Otra';

/** Días que faltan de `desde` a `hasta` (YYYY-MM-DD, sin zona horaria). */
export function diasEntre(desde: string, hasta: string): number {
  const ms = (f: string) => {
    const [a, m, d] = f.split('-').map(Number) as [number, number, number];
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(hasta) - ms(desde)) / 86_400_000);
}
