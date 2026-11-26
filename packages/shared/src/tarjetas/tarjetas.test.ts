import { describe, expect, it } from 'vitest';
import { sumar } from '../dinero';
import {
  calcularResumen,
  generarCuotas,
  proximoResumen,
  resumenDelPeriodo,
  type CierreOverride,
  type ConfigTarjeta,
} from './index';

// Tarjetas de ejemplo (día de cierre / día de vencimiento):
/** Cierra el 25 y vence el 5 del mes siguiente (el caso más común). */
const A: ConfigTarjeta = { diaCierre: 25, diaVencimiento: 5 };
/** Cierra el 5 y vence el 15 del mismo mes. */
const B: ConfigTarjeta = { diaCierre: 5, diaVencimiento: 15 };
/** Cierra el 31 (último día en meses cortos) y vence el 10. */
const C: ConfigTarjeta = { diaCierre: 31, diaVencimiento: 10 };
/** Cierre y vencimiento el mismo día: vence el mes siguiente (estrictamente posterior). */
const D: ConfigTarjeta = { diaCierre: 10, diaVencimiento: 10 };

describe('calcularResumen: primer cierre con fecha >= fecha de compra', () => {
  it.each([
    // tarjeta, compra,           periodo,   cierre,       vencimiento,  caso
    [
      A,
      '2026-11-25',
      '2026-12',
      '2026-11-25',
      '2026-12-05',
      'compra el mismo día del cierre: entra',
    ],
    [
      A,
      '2026-11-26',
      '2027-01',
      '2026-12-25',
      '2027-01-05',
      'un día después del cierre: siguiente (cruce de año)',
    ],
    [A, '2026-11-03', '2026-12', '2026-11-25', '2026-12-05', 'compra a principio de mes'],
    [A, '2026-12-31', '2027-02', '2027-01-25', '2027-02-05', 'compra el 31/12'],
    [B, '2026-11-05', '2026-11', '2026-11-05', '2026-11-15', 'vence el mismo mes del cierre'],
    [B, '2026-11-06', '2026-12', '2026-12-05', '2026-12-15', 'después del cierre: mes siguiente'],
    [C, '2026-02-15', '2026-03', '2026-02-28', '2026-03-10', 'cierre 31 en febrero: último día'],
    [
      C,
      '2028-02-29',
      '2028-03',
      '2028-02-29',
      '2028-03-10',
      'cierre 31 en febrero bisiesto, compra ese día',
    ],
    [C, '2026-03-01', '2026-04', '2026-03-31', '2026-04-10', 'cierre 31 en marzo'],
    [C, '2026-04-30', '2026-05', '2026-04-30', '2026-05-10', 'cierre 31 en un mes de 30: el 30'],
    [
      D,
      '2026-11-10',
      '2026-12',
      '2026-11-10',
      '2026-12-10',
      'vencimiento igual al cierre: mes siguiente',
    ],
  ] as const)('%#: %s → %s (%s)', (tarjeta, compra, periodo, fechaCierre, fechaVencimiento) => {
    expect(calcularResumen(compra, tarjeta)).toEqual({ periodo, fechaCierre, fechaVencimiento });
  });

  describe('con overrides (cierres cargados a mano para un período)', () => {
    const adelanta: CierreOverride = {
      periodo: '2026-12',
      fechaCierre: '2026-11-20',
      fechaVencimiento: '2026-12-01',
    };
    const atrasa: CierreOverride = {
      periodo: '2026-12',
      fechaCierre: '2026-11-28',
      fechaVencimiento: '2026-12-07',
    };

    it('un override que adelanta el cierre: la compra de ese día entra con sus fechas', () => {
      expect(calcularResumen('2026-11-20', A, [adelanta])).toEqual(adelanta);
    });

    it('un override que adelanta el cierre: lo comprado después pasa al siguiente', () => {
      expect(calcularResumen('2026-11-21', A, [adelanta])).toEqual({
        periodo: '2027-01',
        fechaCierre: '2026-12-25',
        fechaVencimiento: '2027-01-05',
      });
    });

    it('un override que atrasa el cierre: lo comprado entre el cierre normal y el nuevo entra', () => {
      expect(calcularResumen('2026-11-27', A, [atrasa])).toEqual(atrasa);
    });

    it('un override de otro período no cambia nada', () => {
      const otro: CierreOverride = {
        periodo: '2027-03',
        fechaCierre: '2027-02-20',
        fechaVencimiento: '2027-03-02',
      };
      expect(calcularResumen('2026-11-26', A, [otro])).toEqual({
        periodo: '2027-01',
        fechaCierre: '2026-12-25',
        fechaVencimiento: '2027-01-05',
      });
    });
  });

  it('rechaza fechas o días inválidos', () => {
    expect(() => calcularResumen('2026-02-30', A)).toThrow();
    expect(() => calcularResumen('2026-11-01', { diaCierre: 0, diaVencimiento: 5 })).toThrow();
    expect(() => calcularResumen('2026-11-01', { diaCierre: 25, diaVencimiento: 32 })).toThrow();
    expect(() => calcularResumen('2026-11-01', { diaCierre: 2.5, diaVencimiento: 5 })).toThrow();
  });
});

describe('resumenDelPeriodo', () => {
  it.each([
    [A, '2026-12', '2026-11-25', '2026-12-05'],
    [A, '2027-01', '2026-12-25', '2027-01-05'],
    [B, '2026-11', '2026-11-05', '2026-11-15'],
    [C, '2026-03', '2026-02-28', '2026-03-10'],
    [D, '2026-12', '2026-11-10', '2026-12-10'],
  ] as const)(
    '%#: período %s → cierre %s, vencimiento %s',
    (tarjeta, periodo, fechaCierre, fechaVencimiento) => {
      expect(resumenDelPeriodo(periodo, tarjeta)).toEqual({
        periodo,
        fechaCierre,
        fechaVencimiento,
      });
    },
  );

  it('usa el override del período si existe', () => {
    const o = { periodo: '2026-12', fechaCierre: '2026-11-20', fechaVencimiento: '2026-12-01' };
    expect(resumenDelPeriodo('2026-12', A, [o])).toEqual(o);
  });
});

describe('proximoResumen: el primero que todavía no venció', () => {
  it.each([
    [A, '2026-11-26', '2026-12'],
    [A, '2026-12-05', '2026-12'], // vence hoy: todavía se puede pagar
    [A, '2026-12-06', '2027-01'],
    [B, '2026-11-10', '2026-11'], // ya cerró, vence el 15
    [B, '2026-11-16', '2026-12'],
  ] as const)('%#: hoy %s → %s', (tarjeta, hoy, periodo) => {
    expect(proximoResumen(hoy, tarjeta).periodo).toBe(periodo);
  });
});

describe('generarCuotas', () => {
  const periodos = (c: { periodoResumen: string }[]) => c.map((x) => x.periodoResumen);

  it('1 cuota: todo en el primer resumen', () => {
    expect(
      generarCuotas({ fecha: '2026-11-25', montoTotal: '15000.00', cantidadCuotas: 1 }, A),
    ).toEqual([{ numero: 1, monto: '15000.00', periodoResumen: '2026-12' }]);
  });

  it('3 cuotas: una por resumen consecutivo, la última absorbe los centavos', () => {
    expect(
      generarCuotas({ fecha: '2026-11-26', montoTotal: '100.00', cantidadCuotas: 3 }, A),
    ).toEqual([
      { numero: 1, monto: '33.33', periodoResumen: '2027-01' },
      { numero: 2, monto: '33.33', periodoResumen: '2027-02' },
      { numero: 3, monto: '33.34', periodoResumen: '2027-03' },
    ]);
  });

  it('18 cuotas: cruzan dos años y suman exactamente el total', () => {
    const cuotas = generarCuotas(
      { fecha: '2026-11-10', montoTotal: '1000.00', cantidadCuotas: 18 },
      A,
    );
    expect(cuotas).toHaveLength(18);
    expect(cuotas[0]).toEqual({ numero: 1, monto: '55.55', periodoResumen: '2026-12' });
    expect(cuotas[17]).toEqual({ numero: 18, monto: '55.65', periodoResumen: '2028-05' });
    expect(sumar(...cuotas.map((c) => c.monto)).toFixed(2)).toBe('1000.00');
    expect(new Set(periodos(cuotas)).size).toBe(18);
  });

  it('centavos: 0,05 en 3 cuotas', () => {
    expect(
      generarCuotas({ fecha: '2026-11-01', montoTotal: '0.05', cantidadCuotas: 3 }, A).map(
        (c) => c.monto,
      ),
    ).toEqual(['0.01', '0.01', '0.03']);
  });

  it('la primera cuota respeta el override; las siguientes, los resúmenes que siguen', () => {
    const o = { periodo: '2026-12', fechaCierre: '2026-11-20', fechaVencimiento: '2026-12-01' };
    expect(
      periodos(
        generarCuotas({ fecha: '2026-11-22', montoTotal: '300.00', cantidadCuotas: 3 }, A, [o]),
      ),
    ).toEqual(['2027-01', '2027-02', '2027-03']);
    expect(
      periodos(
        generarCuotas({ fecha: '2026-11-20', montoTotal: '300.00', cantidadCuotas: 3 }, A, [o]),
      ),
    ).toEqual(['2026-12', '2027-01', '2027-02']);
  });

  it('rechaza cantidades de cuotas o montos inválidos', () => {
    const base = { fecha: '2026-11-01', montoTotal: '100.00' };
    expect(() => generarCuotas({ ...base, cantidadCuotas: 0 }, A)).toThrow();
    expect(() => generarCuotas({ ...base, cantidadCuotas: 1.5 }, A)).toThrow();
    expect(() => generarCuotas({ ...base, montoTotal: '-1', cantidadCuotas: 2 }, A)).toThrow();
  });
});
