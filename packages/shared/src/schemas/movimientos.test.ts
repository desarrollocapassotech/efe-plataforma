import { describe, expect, it } from 'vitest';
import {
  ActualizarMovimientoSchema,
  CrearMovimientoSchema,
  CrearTransferenciaSchema,
  ListarMovimientosQuerySchema,
} from './index';

const base = { cuentaId: 'c1', tipo: 'GASTO', monto: '1500.50', fecha: '2026-11-26' } as const;

describe('movimientos', () => {
  it('crear: válido sin categoría ni descripción', () => {
    expect(CrearMovimientoSchema.parse(base)).toEqual(base);
  });

  it('crear: no acepta moneda (sale de la cuenta) ni usuarioId', () => {
    expect(CrearMovimientoSchema.safeParse({ ...base, moneda: 'USD' }).success).toBe(false);
    expect(CrearMovimientoSchema.safeParse({ ...base, usuarioId: 'x' }).success).toBe(false);
  });

  it('crear: monto positivo y fecha válida', () => {
    expect(CrearMovimientoSchema.safeParse({ ...base, monto: '0' }).success).toBe(false);
    expect(CrearMovimientoSchema.safeParse({ ...base, monto: '-5' }).success).toBe(false);
    expect(CrearMovimientoSchema.safeParse({ ...base, fecha: '2026-02-30' }).success).toBe(false);
  });

  it('actualizar: no deja cambiar el tipo', () => {
    expect(ActualizarMovimientoSchema.safeParse({ tipo: 'INGRESO' }).success).toBe(false);
    expect(ActualizarMovimientoSchema.parse({ categoriaId: null })).toEqual({ categoriaId: null });
  });

  it('listar: defaults, filtros y rango de fechas', () => {
    expect(ListarMovimientosQuerySchema.parse({})).toEqual({ limit: 50 });
    expect(
      ListarMovimientosQuerySchema.parse({
        desde: '2026-11-01',
        hasta: '2026-11-30',
        limit: '20',
        q: ' super ',
      }),
    ).toEqual({ desde: '2026-11-01', hasta: '2026-11-30', limit: 20, q: 'super' });
    expect(
      ListarMovimientosQuerySchema.safeParse({ desde: '2026-12-01', hasta: '2026-11-01' }).success,
    ).toBe(false);
  });
});

describe('transferencias', () => {
  const t = { cuentaOrigenId: 'a', cuentaDestinoId: 'b', montoOrigen: '1000', fecha: '2026-11-26' };

  it('montoDestino es opcional en el schema (la regla de moneda la valida la API)', () => {
    expect(CrearTransferenciaSchema.safeParse(t).success).toBe(true);
    expect(CrearTransferenciaSchema.safeParse({ ...t, montoDestino: '1' }).success).toBe(true);
  });

  it('origen y destino distintos', () => {
    expect(CrearTransferenciaSchema.safeParse({ ...t, cuentaDestinoId: 'a' }).success).toBe(false);
  });
});
