import { describe, expect, it } from 'vitest';
import {
  CierreTarjetaSchema,
  cierreCorrespondeAPeriodo,
  CrearCompraSchema,
  CrearTarjetaSchema,
} from './tarjetas';

describe('schemas de tarjetas', () => {
  it('tarjeta: días 1..31, últimos 4 opcionales de 4 números, rechaza usuarioId', () => {
    expect(CrearTarjetaSchema.parse({ nombre: 'Visa', diaCierre: 25, diaVencimiento: 5 })).toEqual({
      nombre: 'Visa',
      red: 'OTRA',
      diaCierre: 25,
      diaVencimiento: 5,
    });
    expect(
      CrearTarjetaSchema.safeParse({ nombre: 'X', diaCierre: 32, diaVencimiento: 5 }).success,
    ).toBe(false);
    expect(
      CrearTarjetaSchema.safeParse({
        nombre: 'X',
        diaCierre: 1,
        diaVencimiento: 5,
        ultimos4: '123',
      }).success,
    ).toBe(false);
    expect(
      CrearTarjetaSchema.safeParse({ nombre: 'X', diaCierre: 1, diaVencimiento: 5, usuarioId: 'u' })
        .success,
    ).toBe(false);
  });

  it('cierre: vencimiento posterior al cierre y dentro del período', () => {
    const c = { fechaCierre: '2026-11-20', fechaVencimiento: '2026-12-01' };
    expect(CierreTarjetaSchema.parse(c)).toEqual(c);
    expect(CierreTarjetaSchema.safeParse({ ...c, fechaVencimiento: '2026-11-20' }).success).toBe(
      false,
    );
    expect(cierreCorrespondeAPeriodo('2026-12', c)).toBe(true);
    expect(cierreCorrespondeAPeriodo('2026-11', c)).toBe(false);
  });

  it('compra: 1 cuota y pesos por defecto; cuotas enteras de 1 a 72', () => {
    const base = {
      tarjetaId: 't',
      descripcion: 'Heladera',
      fecha: '2026-11-26',
      montoTotal: '900000',
    };
    expect(CrearCompraSchema.parse(base)).toMatchObject({ moneda: 'ARS', cantidadCuotas: 1 });
    expect(CrearCompraSchema.safeParse({ ...base, cantidadCuotas: 0 }).success).toBe(false);
    expect(CrearCompraSchema.safeParse({ ...base, cantidadCuotas: 73 }).success).toBe(false);
    expect(CrearCompraSchema.safeParse({ ...base, montoTotal: 100 }).success).toBe(false);
  });
});
