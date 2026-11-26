import { describe, expect, it } from 'vitest';
import { ActualizarRecurrenciaSchema, CrearRecurrenciaSchema } from './index';

const base = {
  cuentaId: 'c1',
  tipo: 'INGRESO',
  monto: '850000',
  descripcion: 'Sueldo',
  diaDelMes: 5,
  desde: '2026-01-01',
} as const;

describe('recurrencias', () => {
  it('mensual por default', () => {
    expect(CrearRecurrenciaSchema.parse(base)).toMatchObject({ frecuencia: 'MENSUAL' });
  });

  it('anual exige mes; mensual no lleva mes', () => {
    expect(CrearRecurrenciaSchema.safeParse({ ...base, frecuencia: 'ANUAL' }).success).toBe(false);
    expect(
      CrearRecurrenciaSchema.safeParse({ ...base, frecuencia: 'ANUAL', mesDelAnio: 6 }).success,
    ).toBe(true);
    expect(CrearRecurrenciaSchema.safeParse({ ...base, mesDelAnio: 6 }).success).toBe(false);
  });

  it('día 1..31, hasta >= desde, sin moneda', () => {
    expect(CrearRecurrenciaSchema.safeParse({ ...base, diaDelMes: 0 }).success).toBe(false);
    expect(CrearRecurrenciaSchema.safeParse({ ...base, diaDelMes: 32 }).success).toBe(false);
    expect(CrearRecurrenciaSchema.safeParse({ ...base, hasta: '2025-12-31' }).success).toBe(false);
    expect(CrearRecurrenciaSchema.safeParse({ ...base, moneda: 'USD' }).success).toBe(false);
  });

  it('actualizar no deja cambiar el tipo', () => {
    expect(ActualizarRecurrenciaSchema.safeParse({ tipo: 'GASTO' }).success).toBe(false);
    expect(ActualizarRecurrenciaSchema.parse({ activa: false })).toEqual({ activa: false });
  });
});
