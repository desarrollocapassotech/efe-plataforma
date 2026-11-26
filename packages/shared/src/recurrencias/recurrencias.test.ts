import { describe, expect, it } from 'vitest';
import { ocurrenciasRecurrencia, proximaOcurrencia, type ReglaRecurrencia } from './index';

const mensual = (diaDelMes: number, desde: string, hasta?: string): ReglaRecurrencia => ({
  frecuencia: 'MENSUAL',
  diaDelMes,
  desde,
  hasta: hasta ?? null,
});
const fechas = (o: { fecha: string }[]) => o.map((x) => x.fecha);

describe('ocurrenciasRecurrencia: mensual', () => {
  it('una por mes hasta el límite incluido', () => {
    expect(ocurrenciasRecurrencia(mensual(5, '2026-01-01'), '2026-04-05')).toEqual([
      { periodo: '2026-01', fecha: '2026-01-05' },
      { periodo: '2026-02', fecha: '2026-02-05' },
      { periodo: '2026-03', fecha: '2026-03-05' },
      { periodo: '2026-04', fecha: '2026-04-05' },
    ]);
  });

  it('no genera fechas posteriores al límite (nada futuro)', () => {
    expect(fechas(ocurrenciasRecurrencia(mensual(20, '2026-01-01'), '2026-03-19'))).toEqual([
      '2026-01-20',
      '2026-02-20',
    ]);
  });

  it('el 31 en meses cortos cae el último día (incluido febrero bisiesto)', () => {
    expect(fechas(ocurrenciasRecurrencia(mensual(31, '2028-01-01'), '2028-06-30'))).toEqual([
      '2028-01-31',
      '2028-02-29',
      '2028-03-31',
      '2028-04-30',
      '2028-05-31',
      '2028-06-30',
    ]);
    expect(fechas(ocurrenciasRecurrencia(mensual(30, '2026-02-01'), '2026-02-28'))).toEqual([
      '2026-02-28',
    ]);
  });

  it('"desde" a mitad de mes: si el día ya pasó ese mes, arranca el siguiente', () => {
    expect(fechas(ocurrenciasRecurrencia(mensual(5, '2026-03-15'), '2026-05-31'))).toEqual([
      '2026-04-05',
      '2026-05-05',
    ]);
    expect(fechas(ocurrenciasRecurrencia(mensual(20, '2026-03-15'), '2026-04-30'))).toEqual([
      '2026-03-20',
      '2026-04-20',
    ]);
  });

  it('"hasta" corta antes que el límite', () => {
    expect(
      fechas(ocurrenciasRecurrencia(mensual(10, '2026-01-01', '2026-03-09'), '2026-12-31')),
    ).toEqual(['2026-01-10', '2026-02-10']);
  });

  it('cruza el año', () => {
    expect(fechas(ocurrenciasRecurrencia(mensual(1, '2026-11-01'), '2027-02-01'))).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
      '2027-02-01',
    ]);
  });

  it('desde el último período generado: solo lo que falta', () => {
    expect(ocurrenciasRecurrencia(mensual(5, '2026-01-01'), '2026-04-30', '2026-02')).toEqual([
      { periodo: '2026-03', fecha: '2026-03-05' },
      { periodo: '2026-04', fecha: '2026-04-05' },
    ]);
    expect(ocurrenciasRecurrencia(mensual(5, '2026-01-01'), '2026-04-30', '2026-04')).toEqual([]);
    // Un "último generado" anterior a desde no cambia nada.
    expect(
      fechas(ocurrenciasRecurrencia(mensual(5, '2026-03-01'), '2026-03-31', '2025-12')),
    ).toEqual(['2026-03-05']);
  });

  it('límite anterior a desde → vacío', () => {
    expect(ocurrenciasRecurrencia(mensual(5, '2026-05-01'), '2026-04-30')).toEqual([]);
  });
});

describe('ocurrenciasRecurrencia: anual', () => {
  const aguinaldo = (desde: string, hasta?: string): ReglaRecurrencia => ({
    frecuencia: 'ANUAL',
    diaDelMes: 30,
    mesDelAnio: 6,
    desde,
    hasta: hasta ?? null,
  });

  it('una vez por año en el mes indicado', () => {
    expect(ocurrenciasRecurrencia(aguinaldo('2024-01-01'), '2026-11-26')).toEqual([
      { periodo: '2024-06', fecha: '2024-06-30' },
      { periodo: '2025-06', fecha: '2025-06-30' },
      { periodo: '2026-06', fecha: '2026-06-30' },
    ]);
  });

  it('si desde es posterior al mes en ese año, arranca el año siguiente', () => {
    expect(fechas(ocurrenciasRecurrencia(aguinaldo('2024-07-01'), '2026-11-26'))).toEqual([
      '2025-06-30',
      '2026-06-30',
    ]);
  });

  it('29 de febrero anual: en años no bisiestos cae el 28', () => {
    const regla: ReglaRecurrencia = {
      frecuencia: 'ANUAL',
      diaDelMes: 29,
      mesDelAnio: 2,
      desde: '2027-01-01',
    };
    expect(fechas(ocurrenciasRecurrencia(regla, '2029-12-31'))).toEqual([
      '2027-02-28',
      '2028-02-29',
      '2029-02-28',
    ]);
  });

  it('respeta el último generado y hasta', () => {
    expect(
      fechas(
        ocurrenciasRecurrencia(aguinaldo('2024-01-01', '2025-12-31'), '2030-01-01', '2024-06'),
      ),
    ).toEqual(['2025-06-30']);
  });

  it('anual sin mes → error', () => {
    expect(() =>
      ocurrenciasRecurrencia(
        { frecuencia: 'ANUAL', diaDelMes: 1, desde: '2026-01-01' },
        '2026-12-31',
      ),
    ).toThrow(RangeError);
    expect(() => ocurrenciasRecurrencia(mensual(32, '2026-01-01'), '2026-12-31')).toThrow(
      RangeError,
    );
  });
});

describe('proximaOcurrencia', () => {
  it('mensual: la de este mes si no pasó, si no la del siguiente', () => {
    expect(proximaOcurrencia(mensual(28, '2026-01-01'), '2026-11-26')).toEqual({
      periodo: '2026-11',
      fecha: '2026-11-28',
    });
    expect(proximaOcurrencia(mensual(5, '2026-01-01'), '2026-11-26')).toEqual({
      periodo: '2026-12',
      fecha: '2026-12-05',
    });
  });

  it('saltea lo ya generado', () => {
    // Noviembre ya se generó (aunque el 28 todavía no llegó).
    expect(proximaOcurrencia(mensual(28, '2026-01-01'), '2026-11-26', '2026-11')?.fecha).toBe(
      '2026-12-28',
    );
  });

  it('desde futuro, anual y fin de la recurrencia', () => {
    expect(proximaOcurrencia(mensual(10, '2027-03-15'), '2026-11-26')?.fecha).toBe('2027-04-10');
    expect(
      proximaOcurrencia(
        { frecuencia: 'ANUAL', diaDelMes: 30, mesDelAnio: 6, desde: '2020-01-01' },
        '2026-11-26',
      )?.fecha,
    ).toBe('2027-06-30');
    expect(proximaOcurrencia(mensual(5, '2026-01-01', '2026-11-30'), '2026-11-26')).toBeNull();
  });
});
