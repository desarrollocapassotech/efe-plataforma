import { describe, expect, it } from 'vitest';
import { limpiarProfundo, ocultarDatosSensibles } from './index';

describe('ocultarDatosSensibles', () => {
  it('saca emails y montos, deja el resto', () => {
    expect(ocultarDatosSensibles('Falló el pago de juan.perez+efe@gmail.com por $ 1.234,56')).toBe(
      'Falló el pago de [email] por [monto]',
    );
    expect(ocultarDatosSensibles('monto 1234.50 y US$ 10')).toBe('monto [monto] y [monto]');
    expect(ocultarDatosSensibles('saldo 1.234.567')).toBe('saldo [monto]');
    expect(ocultarDatosSensibles('GET /api/v1/movimientos?limit=50 → 500')).toBe(
      'GET /api/v1/movimientos?limit=50 → 500',
    );
  });

  it('limpia objetos anidados', () => {
    expect(limpiarProfundo({ a: 'x@y.com', b: [{ c: '$ 5' }], d: 3 })).toEqual({
      a: '[email]',
      b: [{ c: '[monto]' }],
      d: 3,
    });
  });
});
