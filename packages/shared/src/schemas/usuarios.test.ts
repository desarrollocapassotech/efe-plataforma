import { describe, expect, it } from 'vitest';
import { ActualizarMeSchema, MeSchema } from './index';

describe('ActualizarMeSchema', () => {
  it('acepta cambios parciales', () => {
    expect(ActualizarMeSchema.parse({ nombre: '  Elías ' })).toEqual({ nombre: 'Elías' });
    expect(ActualizarMeSchema.parse({ monedaPrincipal: 'USD' })).toEqual({
      monedaPrincipal: 'USD',
    });
    expect(ActualizarMeSchema.parse({ onboardingCompletado: true, nombre: null })).toEqual({
      onboardingCompletado: true,
      nombre: null,
    });
  });

  it('rechaza body vacío, nombre vacío y moneda inválida', () => {
    expect(ActualizarMeSchema.safeParse({}).success).toBe(false);
    expect(ActualizarMeSchema.safeParse({ nombre: '   ' }).success).toBe(false);
    expect(ActualizarMeSchema.safeParse({ nombre: 'x'.repeat(81) }).success).toBe(false);
    expect(ActualizarMeSchema.safeParse({ monedaPrincipal: 'EUR' }).success).toBe(false);
  });

  it('no deja cambiar rol, plan ni campos desconocidos', () => {
    expect(ActualizarMeSchema.safeParse({ rol: 'ADMIN' }).success).toBe(false);
    expect(ActualizarMeSchema.safeParse({ plan: 'PREMIUM', nombre: 'x' }).success).toBe(false);
    expect(ActualizarMeSchema.safeParse({ usuarioId: 'otro' }).success).toBe(false);
  });
});

describe('MeSchema', () => {
  it('valida la respuesta de /me', () => {
    expect(
      MeSchema.safeParse({
        id: 'c1',
        email: 'a@b.com',
        nombre: null,
        rol: 'USUARIO',
        plan: 'FREE',
        monedaPrincipal: 'ARS',
        onboardingCompletado: false,
        features: ['finanzas'],
        creadoEn: '2026-11-26T15:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});
