import { Prisma } from '@prisma/client';
import { serializarDecimales } from './serializar-decimales';

const D = (v: string) => new Prisma.Decimal(v);

describe('serializarDecimales', () => {
  it('montos con 2 decimales siempre', () => {
    expect(serializarDecimales(D('1234.5'))).toBe('1234.50');
    expect(serializarDecimales(D('0'))).toBe('0.00');
    expect(serializarDecimales(D('-10'))).toBe('-10.00');
    expect(serializarDecimales(D('9999999999999999.99'))).toBe('9999999999999999.99');
  });

  it('valores con más precisión conservan sus decimales', () => {
    expect(serializarDecimales(D('1234.567800'))).toBe('1234.5678');
  });

  it('recorre objetos y arrays anidados sin tocar el resto', () => {
    const fecha = new Date('2026-11-26T10:00:00Z');
    expect(
      serializarDecimales({
        id: 'c1',
        monto: D('10.1'),
        activo: true,
        nota: null,
        creadoEn: fecha,
        cuotas: [{ monto: D('3.3') }, { monto: D('3.4') }],
      }),
    ).toEqual({
      id: 'c1',
      monto: '10.10',
      activo: true,
      nota: null,
      creadoEn: fecha,
      cuotas: [{ monto: '3.30' }, { monto: '3.40' }],
    });
  });

  it('primitivos quedan igual', () => {
    expect(serializarDecimales('x')).toBe('x');
    expect(serializarDecimales(3)).toBe(3);
    expect(serializarDecimales(undefined)).toBeUndefined();
  });
});
