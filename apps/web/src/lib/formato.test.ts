import { describe, expect, it } from 'vitest';
import { montoCompacto, porcentajeRedondo } from './formato';

const s = (t: string) => t.replace(/\u00a0/g, ' ');

describe('montoCompacto', () => {
  it('abrevia millones y miles', () => {
    expect(s(montoCompacto('1250000.00', 'ARS'))).toBe('$ 1,3 M');
    expect(s(montoCompacto('1200000', 'ARS'))).toBe('$ 1,2 M');
    expect(s(montoCompacto('850400.50', 'ARS'))).toBe('$ 850 mil');
    expect(s(montoCompacto('950.40', 'USD'))).toBe('US$ 950');
    expect(s(montoCompacto('-2000', 'ARS'))).toBe('-$ 2 mil');
    expect(s(montoCompacto(0, 'ARS'))).toBe('$ 0');
  });

  it('porcentaje redondo', () => {
    expect(s(porcentajeRedondo('46.51'))).toBe('47 %');
    expect(s(porcentajeRedondo('-12.20'))).toBe('-12 %');
  });
});
