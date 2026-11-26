import type { PuntoEvolucion } from '@efe/shared/schemas';
import { describe, expect, it } from 'vitest';
import { fondoSugerido, gastoPromedio } from './plantillas';

const mes = (periodo: string, gastos: string): PuntoEvolucion => ({
  periodo,
  ingresos: '0.00',
  gastos,
  gastosMovimientos: gastos,
  gastosTarjeta: '0.00',
  saldo: '0.00',
});

describe('fondo de emergencia', () => {
  it('promedia los meses cerrados con gastos (sin el actual ni los vacíos)', () => {
    const meses = [
      mes('2026-08', '0.00'),
      mes('2026-09', '600000.00'),
      mes('2026-10', '900000.00'),
      mes('2026-11', '50000.00'),
    ];
    expect(gastoPromedio(meses, '2026-11')).toBe('750000.00');
    expect(fondoSugerido('750000.00', 3)).toBe('2250000.00');
    expect(fondoSugerido('750000.00', 6)).toBe('4500000.00');
  });

  it('sin meses cerrados con gastos no sugiere', () => {
    expect(gastoPromedio([mes('2026-11', '1000.00')], '2026-11')).toBeNull();
  });
});
