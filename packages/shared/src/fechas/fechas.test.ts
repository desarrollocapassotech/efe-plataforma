import { describe, expect, it } from 'vitest';
import {
  compararFechas,
  diasEnPeriodo,
  esFechaValida,
  esPeriodoValido,
  fechaConDia,
  hoy,
  periodoDe,
  periodosEntre,
  rangoDePeriodo,
  sumarDias,
  sumarPeriodos,
} from './index';

describe('validación', () => {
  it('períodos', () => {
    expect(esPeriodoValido('2026-01')).toBe(true);
    expect(esPeriodoValido('2026-12')).toBe(true);
    expect(esPeriodoValido('2026-13')).toBe(false);
    expect(esPeriodoValido('2026-00')).toBe(false);
    expect(esPeriodoValido('2026-1')).toBe(false);
    expect(esPeriodoValido('202601')).toBe(false);
    expect(esPeriodoValido('2026-01-01')).toBe(false);
  });

  it('fechas', () => {
    expect(esFechaValida('2026-11-26')).toBe(true);
    expect(esFechaValida('2028-02-29')).toBe(true);
    expect(esFechaValida('2026-02-29')).toBe(false);
    expect(esFechaValida('2026-04-31')).toBe(false);
    expect(esFechaValida('2026-11-00')).toBe(false);
    expect(esFechaValida('2026-11-26T00:00:00Z')).toBe(false);
    expect(esFechaValida('26/11/2026')).toBe(false);
  });
});

describe('periodoDe', () => {
  it('devuelve YYYY-MM', () => {
    expect(periodoDe('2026-03-15')).toBe('2026-03');
    expect(periodoDe('2026-12-31')).toBe('2026-12');
  });

  it('falla con fecha inválida', () => {
    expect(() => periodoDe('2026-02-30')).toThrow(RangeError);
  });
});

describe('sumarPeriodos', () => {
  it('dentro del año', () => {
    expect(sumarPeriodos('2026-03', 0)).toBe('2026-03');
    expect(sumarPeriodos('2026-03', 1)).toBe('2026-04');
  });

  it('cruce de año hacia adelante y hacia atrás', () => {
    expect(sumarPeriodos('2026-11', 3)).toBe('2027-02');
    expect(sumarPeriodos('2026-12', 1)).toBe('2027-01');
    expect(sumarPeriodos('2027-01', -1)).toBe('2026-12');
    expect(sumarPeriodos('2026-02', -14)).toBe('2024-12');
    expect(sumarPeriodos('2026-01', 24)).toBe('2028-01');
  });

  it('falla con n no entero', () => {
    expect(() => sumarPeriodos('2026-01', 1.5)).toThrow(RangeError);
  });
});

describe('rangoDePeriodo', () => {
  it('meses de 31, 30, febrero común y bisiesto', () => {
    expect(rangoDePeriodo('2026-01')).toEqual({ desde: '2026-01-01', hasta: '2026-01-31' });
    expect(rangoDePeriodo('2026-04')).toEqual({ desde: '2026-04-01', hasta: '2026-04-30' });
    expect(rangoDePeriodo('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(rangoDePeriodo('2028-02')).toEqual({ desde: '2028-02-01', hasta: '2028-02-29' });
  });

  it('diasEnPeriodo, incluyendo reglas de siglo', () => {
    expect(diasEnPeriodo('2100-02')).toBe(28);
    expect(diasEnPeriodo('2000-02')).toBe(29);
    expect(diasEnPeriodo('2026-09')).toBe(30);
  });
});

describe('periodosEntre', () => {
  it('incluye ambos extremos y cruza el año', () => {
    expect(periodosEntre('2026-11', '2027-02')).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
  });

  it('mismo período y orden invertido', () => {
    expect(periodosEntre('2026-05', '2026-05')).toEqual(['2026-05']);
    expect(periodosEntre('2026-06', '2026-05')).toEqual([]);
  });

  it('12 meses', () => {
    expect(periodosEntre('2026-01', '2026-12')).toHaveLength(12);
  });
});

describe('fechaConDia', () => {
  it('días que existen', () => {
    expect(fechaConDia('2026-03', 1)).toBe('2026-03-01');
    expect(fechaConDia('2026-03', 15)).toBe('2026-03-15');
    expect(fechaConDia('2026-03', 31)).toBe('2026-03-31');
  });

  it('febrero bisiesto y común', () => {
    expect(fechaConDia('2028-02', 31)).toBe('2028-02-29');
    expect(fechaConDia('2028-02', 29)).toBe('2028-02-29');
    expect(fechaConDia('2026-02', 29)).toBe('2026-02-28');
    expect(fechaConDia('2026-02', 30)).toBe('2026-02-28');
    expect(fechaConDia('2100-02', 29)).toBe('2100-02-28');
  });

  it('meses de 30 días', () => {
    for (const mes of ['04', '06', '09', '11']) {
      expect(fechaConDia(`2026-${mes}`, 31)).toBe(`2026-${mes}-30`);
      expect(fechaConDia(`2026-${mes}`, 30)).toBe(`2026-${mes}-30`);
    }
  });

  it('día inválido', () => {
    expect(() => fechaConDia('2026-03', 0)).toThrow(RangeError);
    expect(() => fechaConDia('2026-03', 32)).toThrow(RangeError);
    expect(() => fechaConDia('2026-03', 1.5)).toThrow(RangeError);
    expect(() => fechaConDia('2026-13', 1)).toThrow(RangeError);
  });
});

describe('sumarDias y compararFechas', () => {
  it('cruza mes, año y bisiesto', () => {
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
    expect(sumarDias('2026-02-28', 1)).toBe('2026-03-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2027-01-01', -1)).toBe('2026-12-31');
    expect(sumarDias('2026-01-31', 30)).toBe('2026-03-02');
  });

  it('no se corre en días de cambio de horario (TZ de tests con DST)', () => {
    // Brasil tuvo DST con cambio a medianoche: con Date local esto daba el mismo día dos veces.
    expect(sumarDias('2018-11-03', 1)).toBe('2018-11-04');
    expect(sumarDias('2018-11-04', 1)).toBe('2018-11-05');
  });

  it('compara', () => {
    expect(compararFechas('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compararFechas('2026-01-02', '2026-01-02')).toBe(0);
    expect(compararFechas('2027-01-01', '2026-12-31')).toBe(1);
  });
});

describe('hoy', () => {
  it('usa la zona pedida y no la del proceso', () => {
    // 2026-11-27 01:30 UTC = 2026-11-26 22:30 en Argentina (UTC−3).
    const ahora = new Date('2026-11-27T01:30:00Z');
    expect(hoy('America/Argentina/Buenos_Aires', ahora)).toBe('2026-11-26');
    expect(hoy('UTC', ahora)).toBe('2026-11-27');
    expect(hoy(undefined, ahora)).toBe('2026-11-26');
  });
});
