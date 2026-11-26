import { describe, expect, it } from 'vitest';
import { fechaCorta, nombreDia, nombrePeriodo, periodoCorto } from './fechas-ui';

describe('fechas-ui', () => {
  const hoy = '2026-11-26';

  it('nombra el período con o sin año', () => {
    expect(nombrePeriodo('2026-11', hoy)).toBe('Noviembre');
    expect(nombrePeriodo('2025-01', hoy)).toBe('Enero 2025');
  });

  it('nombra el día como hoy, ayer o con día de la semana', () => {
    expect(nombreDia('2026-11-26', hoy)).toBe('Hoy');
    expect(nombreDia('2026-11-25', hoy)).toBe('Ayer');
    expect(nombreDia('2026-11-23', hoy)).toBe('Lunes 23 de noviembre');
    expect(nombreDia('2025-12-31', hoy)).toBe('Miércoles 31 de diciembre de 2025');
  });

  it('ayer cruza el mes', () => {
    expect(nombreDia('2026-11-30', '2026-12-01')).toBe('Ayer');
  });

  it('formatos cortos', () => {
    expect(periodoCorto('2026-03')).toBe('mar');
    expect(periodoCorto('2026-03', true)).toBe('mar 26');
    expect(fechaCorta('2026-03-05')).toBe('05/03/2026');
  });
});
