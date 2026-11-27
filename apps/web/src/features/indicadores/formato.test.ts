import { describe, expect, it } from 'vitest';
import { formatearPorcentaje } from './formato';

const s = (t: string) => t.replace(/\u00a0/g, ' ');

describe('formatearPorcentaje', () => {
  it('formatea con coma y signo opcional', () => {
    expect(s(formatearPorcentaje('3.7'))).toBe('3,7 %');
    expect(s(formatearPorcentaje('12.43', 0))).toBe('12 %');
    expect(s(formatearPorcentaje('2', 1, true))).toBe('+2,0 %');
    expect(s(formatearPorcentaje('-0.55', 1, true))).toBe('-0,6 %');
    expect(s(formatearPorcentaje('0', 1, true))).toBe('0,0 %');
  });
});
