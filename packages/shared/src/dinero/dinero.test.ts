import { describe, expect, it } from 'vitest';
import {
  aString2Decimales,
  cotizacionImplicita,
  comparar,
  dinero,
  dividir,
  dividirEnCuotas,
  esCero,
  formatearMoneda,
  multiplicar,
  porcentaje,
  restar,
  sumar,
  variacionPorcentual,
} from './index';

const sumaCuotas = (cuotas: string[]) => aString2Decimales(sumar(...cuotas));

describe('dinero', () => {
  it('acepta strings, numbers y Decimal', () => {
    expect(dinero('1234.5').toFixed(2)).toBe('1234.50');
    expect(dinero(10).toFixed(2)).toBe('10.00');
    expect(dinero(dinero('3')).toFixed(0)).toBe('3');
  });

  it('rechaza valores inválidos', () => {
    expect(() => dinero('')).toThrow(RangeError);
    expect(() => dinero('abc')).toThrow(RangeError);
    expect(() => dinero(Number.NaN)).toThrow(RangeError);
    expect(() => dinero(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('opera sin error de punto flotante', () => {
    expect(aString2Decimales(sumar('0.1', '0.2'))).toBe('0.30');
    expect(sumar('0.1', '0.2').equals(dinero('0.3'))).toBe(true);
    expect(aString2Decimales(restar('100', '0.01'))).toBe('99.99');
    expect(aString2Decimales(multiplicar('19.99', 3))).toBe('59.97');
    expect(aString2Decimales(dividir('10', 4))).toBe('2.50');
    expect(aString2Decimales(sumar())).toBe('0.00');
  });

  it('dividir por cero falla', () => {
    expect(() => dividir('10', '0')).toThrow(RangeError);
  });

  it('esCero y comparar', () => {
    expect(esCero('0.00')).toBe(true);
    expect(esCero('-0')).toBe(true);
    expect(esCero('0.01')).toBe(false);
    expect(comparar('1.10', '1.1')).toBe(0);
    expect(comparar('1', '2')).toBe(-1);
    expect(comparar('2', '1')).toBe(1);
  });

  it('aString2Decimales redondea half up y nunca devuelve -0.00', () => {
    expect(aString2Decimales('1234.5')).toBe('1234.50');
    expect(aString2Decimales('1.005')).toBe('1.01');
    expect(aString2Decimales('1.004')).toBe('1.00');
    expect(aString2Decimales('-1.005')).toBe('-1.01');
    expect(aString2Decimales('-0.001')).toBe('0.00');
    expect(aString2Decimales('9999999999999999.99')).toBe('9999999999999999.99');
  });
});

describe('dividirEnCuotas', () => {
  it('1 cuota devuelve el total', () => {
    expect(dividirEnCuotas('1500.00', 1)).toEqual(['1500.00']);
  });

  it('3 cuotas que no dividen exacto: la última absorbe', () => {
    expect(dividirEnCuotas('100.00', 3)).toEqual(['33.33', '33.33', '33.34']);
  });

  it('7 cuotas', () => {
    const cuotas = dividirEnCuotas('1000.00', 7);
    expect(cuotas).toEqual([...Array<string>(6).fill('142.85'), '142.90']);
    expect(sumaCuotas(cuotas)).toBe('1000.00');
  });

  it('12 cuotas exactas', () => {
    expect(dividirEnCuotas('1200', 12)).toEqual(Array<string>(12).fill('100.00'));
  });

  it('12 cuotas con centavos', () => {
    const cuotas = dividirEnCuotas('999.99', 12);
    expect(cuotas.slice(0, 11)).toEqual(Array<string>(11).fill('83.33'));
    expect(cuotas[11]).toBe('83.36');
    expect(sumaCuotas(cuotas)).toBe('999.99');
  });

  it('monto menor que la cantidad de cuotas en centavos', () => {
    expect(dividirEnCuotas('0.05', 3)).toEqual(['0.01', '0.01', '0.03']);
    expect(dividirEnCuotas('0.02', 3)).toEqual(['0.00', '0.00', '0.02']);
  });

  it('total con un decimal', () => {
    expect(dividirEnCuotas('10.1', 3)).toEqual(['3.36', '3.36', '3.38']);
  });

  it('la suma es exactamente el total en muchos casos', () => {
    const totales = ['0.01', '1.00', '33.33', '12345.67', '99999.99', '1000000.01'];
    for (const total of totales) {
      for (let n = 1; n <= 24; n++) {
        const cuotas = dividirEnCuotas(total, n);
        expect(cuotas).toHaveLength(n);
        expect(sumaCuotas(cuotas)).toBe(aString2Decimales(total));
        // Todas las cuotas menos la última son iguales y la última es >= a las demás.
        const primera = cuotas[0]!;
        for (const c of cuotas.slice(0, -1)) expect(c).toBe(primera);
        expect(comparar(cuotas.at(-1)!, primera)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('rechaza entradas inválidas', () => {
    expect(() => dividirEnCuotas('100', 0)).toThrow(RangeError);
    expect(() => dividirEnCuotas('100', 1.5)).toThrow(RangeError);
    expect(() => dividirEnCuotas('100.001', 3)).toThrow(RangeError);
    expect(() => dividirEnCuotas('-100', 3)).toThrow(RangeError);
    expect(() => dividirEnCuotas('abc', 3)).toThrow(RangeError);
  });
});

describe('porcentaje y variacionPorcentual', () => {
  it('porcentaje con 2 decimales, null si el total es cero', () => {
    expect(porcentaje('700', '1500.50')).toBe('46.65');
    expect(porcentaje('50.25', '700')).toBe('7.18');
    expect(porcentaje('0', '100')).toBe('0.00');
    expect(porcentaje('150', '100')).toBe('150.00');
    expect(porcentaje('10', '0')).toBeNull();
  });

  it('variación positiva, negativa, nula y sin base', () => {
    expect(variacionPorcentual('1500.50', '1000')).toBe('50.05');
    expect(variacionPorcentual('400', '500')).toBe('-20.00');
    expect(variacionPorcentual('500', '500')).toBe('0.00');
    expect(variacionPorcentual('100', '0')).toBeNull();
  });
});

describe('cotizacionImplicita', () => {
  it('pesos por dólar en los dos sentidos', () => {
    expect(
      cotizacionImplicita({ moneda: 'ARS', monto: '125000' }, { moneda: 'USD', monto: '100' }),
    ).toBe('1250.00');
    expect(
      cotizacionImplicita({ moneda: 'USD', monto: '100' }, { moneda: 'ARS', monto: '123456.78' }),
    ).toBe('1234.57');
  });

  it('null si las monedas son iguales', () => {
    expect(
      cotizacionImplicita({ moneda: 'ARS', monto: '10' }, { moneda: 'ARS', monto: '10' }),
    ).toBeNull();
  });
});

describe('formatearMoneda', () => {
  const NBSP = ' ';

  it('ARS y USD en formato es-AR', () => {
    expect(formatearMoneda('1234.5', 'ARS')).toBe(`$${NBSP}1.234,50`);
    expect(formatearMoneda('1234.5', 'USD')).toBe(`US$${NBSP}1.234,50`);
  });

  it('separador de miles en montos grandes y chicos', () => {
    expect(formatearMoneda('0', 'ARS')).toBe(`$${NBSP}0,00`);
    expect(formatearMoneda('0.5', 'ARS')).toBe(`$${NBSP}0,50`);
    expect(formatearMoneda('999', 'ARS')).toBe(`$${NBSP}999,00`);
    expect(formatearMoneda('1000', 'ARS')).toBe(`$${NBSP}1.000,00`);
    expect(formatearMoneda('1234567.89', 'ARS')).toBe(`$${NBSP}1.234.567,89`);
    expect(formatearMoneda('9999999999999999.99', 'USD')).toBe(
      `US$${NBSP}9.999.999.999.999.999,99`,
    );
  });

  it('negativos', () => {
    expect(formatearMoneda('-1234.5', 'ARS')).toBe(`-$${NBSP}1.234,50`);
    expect(formatearMoneda('-0.001', 'ARS')).toBe(`$${NBSP}0,00`);
  });

  it('redondea half up', () => {
    expect(formatearMoneda('1.005', 'ARS')).toBe(`$${NBSP}1,01`);
  });

  it('opciones: sin decimales y con signo', () => {
    expect(formatearMoneda('1234.5', 'ARS', { decimales: 0 })).toBe(`$${NBSP}1.235`);
    expect(formatearMoneda('150', 'USD', { signo: true })).toBe(`+US$${NBSP}150,00`);
    expect(formatearMoneda('-150', 'USD', { signo: true })).toBe(`-US$${NBSP}150,00`);
    expect(formatearMoneda('0', 'USD', { signo: true })).toBe(`US$${NBSP}0,00`);
  });

  it('coincide con Intl es-AR (salvo dependencias de ICU)', () => {
    const intl = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
    expect(formatearMoneda('1234.5', 'ARS')).toBe(intl.format(1234.5));
  });
});
