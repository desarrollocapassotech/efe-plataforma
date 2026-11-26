import { describe, expect, it } from 'vitest';
import { procesarEntradaMonto, textoDesdeValor } from './montos';

const p = (s: string, negativo = false) => procesarEntradaMonto(s, { permitirNegativo: negativo });

describe('procesarEntradaMonto', () => {
  it('agrega puntos de miles mientras se escribe', () => {
    expect(p('1')).toEqual({ texto: '1', valor: '1' });
    expect(p('1234')).toEqual({ texto: '1.234', valor: '1234' });
    expect(p('1.2345')).toEqual({ texto: '12.345', valor: '12345' });
    expect(p('1234567')).toEqual({ texto: '1.234.567', valor: '1234567' });
  });

  it('coma decimal con hasta 2 decimales', () => {
    expect(p('1.234,')).toEqual({ texto: '1.234,', valor: '1234' });
    expect(p('1.234,5')).toEqual({ texto: '1.234,5', valor: '1234.5' });
    expect(p('1.234,567')).toEqual({ texto: '1.234,56', valor: '1234.56' });
    expect(p(',5')).toEqual({ texto: '0,5', valor: '0.5' });
  });

  it('un punto escrito al final se toma como coma decimal', () => {
    expect(p('1.234.')).toEqual({ texto: '1.234,', valor: '1234' });
    expect(p('15.')).toEqual({ texto: '15,', valor: '15' });
  });

  it('ignora letras, ceros a la izquierda y vacío', () => {
    expect(p('abc12x')).toEqual({ texto: '12', valor: '12' });
    expect(p('0005')).toEqual({ texto: '5', valor: '5' });
    expect(p('0')).toEqual({ texto: '0', valor: '0' });
    expect(p('')).toEqual({ texto: '', valor: '' });
  });

  it('negativos solo si se permiten', () => {
    expect(p('-50')).toEqual({ texto: '50', valor: '50' });
    expect(p('-50', true)).toEqual({ texto: '-50', valor: '-50' });
    expect(p('-', true)).toEqual({ texto: '-', valor: '' });
    expect(p('-1.000,5', true)).toEqual({ texto: '-1.000,5', valor: '-1000.5' });
  });

  it('máximo 16 dígitos enteros', () => {
    expect(p('12345678901234567890').valor).toBe('1234567890123456');
  });
});

describe('textoDesdeValor', () => {
  it('formatea valores guardados', () => {
    expect(textoDesdeValor('1234.50')).toBe('1.234,50');
    expect(textoDesdeValor('-300.00')).toBe('-300,00');
    expect(textoDesdeValor('0')).toBe('0');
    expect(textoDesdeValor('')).toBe('');
  });
});
