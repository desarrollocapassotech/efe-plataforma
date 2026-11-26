import { describe, expect, it } from 'vitest';
import {
  FechaSchema,
  MonedaSchema,
  MontoSchema,
  PaginacionQuerySchema,
  PeriodoSchema,
} from './index';

describe('schemas base', () => {
  it('MonedaSchema', () => {
    expect(MonedaSchema.safeParse('ARS').success).toBe(true);
    expect(MonedaSchema.safeParse('USD').success).toBe(true);
    expect(MonedaSchema.safeParse('EUR').success).toBe(false);
    expect(MonedaSchema.safeParse('ars').success).toBe(false);
  });

  it('PeriodoSchema', () => {
    expect(PeriodoSchema.safeParse('2026-11').success).toBe(true);
    expect(PeriodoSchema.safeParse('2026-13').success).toBe(false);
    expect(PeriodoSchema.safeParse('2026-11-01').success).toBe(false);
  });

  it('FechaSchema', () => {
    expect(FechaSchema.safeParse('2028-02-29').success).toBe(true);
    expect(FechaSchema.safeParse('2026-02-29').success).toBe(false);
    expect(FechaSchema.safeParse('2026-11-26T10:00:00Z').success).toBe(false);
  });

  it('MontoSchema acepta positivos con hasta 2 decimales', () => {
    for (const v of ['1', '0.01', '1234.5', '1234.50', '9999999999999999.99']) {
      expect(MontoSchema.safeParse(v).success, v).toBe(true);
    }
  });

  it('MontoSchema rechaza cero, negativos, formatos y números', () => {
    for (const v of [
      '0',
      '0.00',
      '00',
      '-1',
      '1.234',
      '1,50',
      '1.234,50',
      '.5',
      '5.',
      ' 5',
      '1e3',
      '',
      '10000000000000000',
    ]) {
      expect(MontoSchema.safeParse(v).success, v).toBe(false);
    }
    expect(MontoSchema.safeParse(10).success).toBe(false);
  });

  it('PaginacionQuerySchema: default, coerción y límites', () => {
    expect(PaginacionQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(PaginacionQuerySchema.parse({ limit: '20', cursor: 'abc' })).toEqual({
      limit: 20,
      cursor: 'abc',
    });
    expect(PaginacionQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(PaginacionQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(PaginacionQuerySchema.safeParse({ limit: '2.5' }).success).toBe(false);
    expect(PaginacionQuerySchema.safeParse({ cursor: '' }).success).toBe(false);
  });
});
