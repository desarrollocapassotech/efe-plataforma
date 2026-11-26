import { describe, expect, it } from 'vitest';
import { calcularAvance, inicioRitmo, mesesHasta, resumirAportes } from './index';

const hoy = '2026-11-26';

describe('mesesHasta', () => {
  it('cuenta meses calendario; mínimo 1 si la fecha es de este mes; 0 si pasó', () => {
    expect(mesesHasta(hoy, '2027-05-31')).toBe(6);
    expect(mesesHasta(hoy, '2027-11-01')).toBe(12);
    expect(mesesHasta(hoy, '2026-11-30')).toBe(1);
    expect(mesesHasta(hoy, '2026-11-26')).toBe(1);
    expect(mesesHasta(hoy, '2026-10-31')).toBe(0);
  });
});

describe('calcularAvance', () => {
  const base = { montoObjetivo: '1200000', hoy };

  it('con fecha: aporte sugerido = faltante / meses restantes; en camino si el ritmo alcanza', () => {
    const a = calcularAvance({
      ...base,
      acumulado: '300000',
      aportadoUltimosMeses: '450000', // 150.000 por mes
      fechaObjetivo: '2027-05-31',
    });
    expect(a).toEqual({
      acumulado: '300000.00',
      porcentaje: '25.00',
      faltante: '900000.00',
      mesesRestantes: 6,
      aporteMensualSugerido: '150000.00',
      ritmoMensual: '150000.00',
      fechaEstimada: '2027-05-26',
      enCamino: true,
    });
  });

  it('atrasado: el ritmo no llega a la fecha', () => {
    const a = calcularAvance({
      ...base,
      acumulado: '300000',
      aportadoUltimosMeses: '300000', // 100.000 por mes → 9 meses
      fechaObjetivo: '2027-05-31',
    });
    expect(a.fechaEstimada).toBe('2027-08-26');
    expect(a.enCamino).toBe(false);
  });

  it('el aporte planeado manda sobre el promedio', () => {
    const a = calcularAvance({
      ...base,
      acumulado: '0',
      aportadoUltimosMeses: '0',
      aporteMensualPlaneado: '400000',
    });
    expect(a.ritmoMensual).toBe('400000.00');
    expect(a.fechaEstimada).toBe('2027-02-26');
    expect(a.mesesRestantes).toBeNull();
    expect(a.aporteMensualSugerido).toBeNull();
    expect(a.enCamino).toBe(true);
  });

  it('sin aportes ni plan: no hay fecha estimada ni está en camino', () => {
    const a = calcularAvance({ ...base, acumulado: '0', aportadoUltimosMeses: '0' });
    expect(a).toMatchObject({ porcentaje: '0.00', fechaEstimada: null, enCamino: false });
  });

  it('cumplido: 100 % con tope, faltante 0, sin sugerido', () => {
    const a = calcularAvance({
      ...base,
      acumulado: '1500000',
      aportadoUltimosMeses: '0',
      fechaObjetivo: '2027-05-31',
    });
    expect(a).toMatchObject({
      porcentaje: '100.00',
      faltante: '0.00',
      aporteMensualSugerido: null,
      fechaEstimada: null,
      enCamino: true,
    });
  });

  it('fecha pasada sin completar: sugerido = todo lo que falta, atrasado', () => {
    const a = calcularAvance({
      ...base,
      acumulado: '1000000',
      aportadoUltimosMeses: '0',
      fechaObjetivo: '2026-10-01',
    });
    expect(a).toMatchObject({
      mesesRestantes: 0,
      aporteMensualSugerido: '200000.00',
      enCamino: false,
    });
  });

  it('retiros que dejan el acumulado negativo: porcentaje 0, faltante mayor al objetivo', () => {
    const a = calcularAvance({ ...base, acumulado: '-100', aportadoUltimosMeses: '-100' });
    expect(a).toMatchObject({ porcentaje: '0.00', faltante: '1200100.00', enCamino: false });
  });

  it('centavos: el sugerido se redondea a 2 decimales', () => {
    const a = calcularAvance({
      montoObjetivo: '100',
      acumulado: '0',
      aportadoUltimosMeses: '0',
      fechaObjetivo: '2027-02-15',
      hoy,
    });
    expect(a.aporteMensualSugerido).toBe('33.33');
  });
});

describe('resumirAportes', () => {
  it('acumulado total y lo de los últimos 3 meses (incluido este)', () => {
    expect(inicioRitmo(hoy)).toBe('2026-09-01');
    expect(
      resumirAportes(
        [
          { monto: '1000', fecha: '2026-08-31' },
          { monto: '500', fecha: '2026-09-01' },
          { monto: '-200', fecha: '2026-10-15' },
          { monto: '300.50', fecha: '2026-11-26' },
        ],
        hoy,
      ),
    ).toEqual({ acumulado: '1600.50', aportadoUltimosMeses: '600.50' });
  });
});
