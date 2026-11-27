import { describe, expect, it } from 'vitest';
import { brecha, esCodigoIndicador, esPrecioValido, ipcAcumulado, valorIndicador } from './index';

describe('indicadores', () => {
  it('brecha contra el oficial', () => {
    expect(brecha('1500', '1000')).toBe('50.00');
    expect(brecha('1180.50', '1050')).toBe('12.43');
    expect(brecha('950', '1000')).toBe('-5.00');
    expect(brecha('1000', '0')).toBeNull();
  });

  it('IPC acumulado: compuesto, no sumado', () => {
    expect(ipcAcumulado(['2', '3'])).toBe('5.06');
    expect(ipcAcumulado(['2.2', '2.4', '3.7'])).toBe('8.52');
    expect(ipcAcumulado([])).toBe('0.00');
    expect(ipcAcumulado(['-1', '1'])).toBe('-0.01');
  });

  it('valor de indicador con hasta 6 decimales', () => {
    expect(valorIndicador(1050)).toBe('1050');
    expect(valorIndicador(0.0271234567)).toBe('0.027123');
    expect(valorIndicador('2.7')).toBe('2.7');
    expect(() => valorIndicador(Number.NaN)).toThrow();
  });

  it('códigos y precios válidos', () => {
    expect(esCodigoIndicador('DOLAR_MEP_VENTA')).toBe(true);
    expect(esCodigoIndicador('DOLAR_BLUE')).toBe(false);
    expect(esPrecioValido('1')).toBe(true);
    expect(esPrecioValido('0')).toBe(false);
  });
});
