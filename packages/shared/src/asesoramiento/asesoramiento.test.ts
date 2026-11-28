import { describe, expect, it } from 'vitest';
import {
  brokersDeDatos,
  clienteHabilitado,
  conNuevoMonto,
  conPlan,
  errorSuscripcion,
  estaAtrasado,
  facturableEn,
  mismoBroker,
  montoActual,
  montoEn,
  normalizarBrokers,
  periodoAFacturar,
  periodoBajaHoy,
  puedeAsignarPlan,
  separarBrokers,
  suscripcionActiva,
  type Suscripcion,
} from './index';

const ACTUAL = '2026-11';
const sus = (parcial: Partial<Suscripcion> = {}): Suscripcion => ({
  planId: 'p1',
  desde: '2026-03',
  hasta: null,
  historial: [
    { monto: '10000.00', desde: '2026-03' },
    { monto: '14900.00', desde: '2026-09' },
  ],
  ...parcial,
});

describe('suscripciones', () => {
  it('mes vencido', () => {
    expect(periodoAFacturar(ACTUAL)).toBe('2026-10');
    expect(periodoAFacturar('2026-01')).toBe('2025-12');
  });

  it('monto vigente en cada mes (el último que ya regía)', () => {
    const s = sus();
    expect(montoEn(s, '2026-02')).toBeUndefined();
    expect(montoEn(s, '2026-03')).toBe('10000.00');
    expect(montoEn(s, '2026-08')).toBe('10000.00');
    expect(montoEn(s, '2026-09')).toBe('14900.00');
    expect(montoActual(s, ACTUAL)).toBe('14900.00');
    // Todos futuros: el primero.
    expect(montoActual(sus({ historial: [{ monto: '5.00', desde: '2027-01' }] }), ACTUAL)).toBe(
      '5.00',
    );
  });

  it('un monto nuevo reemplaza el del mismo mes y descarta los posteriores', () => {
    const h = [
      { monto: '1.00', desde: '2026-01' },
      { monto: '2.00', desde: '2026-06' },
      { monto: '3.00', desde: '2026-09' },
    ];
    expect(conNuevoMonto(h, '9', '2026-06')).toEqual([
      { monto: '1.00', desde: '2026-01' },
      { monto: '9.00', desde: '2026-06' },
    ]);
  });

  it('facturable: dentro de alta/baja y con monto > 0', () => {
    expect(facturableEn(sus(), '2026-02')).toBe(false);
    expect(facturableEn(sus(), '2026-03')).toBe(true);
    expect(facturableEn(sus({ hasta: '2026-10' }), '2026-10')).toBe(true);
    expect(facturableEn(sus({ hasta: '2026-10' }), '2026-11')).toBe(false);
    expect(facturableEn(sus({ historial: [{ monto: '0.00', desde: '2026-03' }] }), '2026-05')).toBe(
      false,
    );
    expect(facturableEn(null, '2026-05')).toBe(false);
  });

  it('activa si la baja no es anterior al mes vencido', () => {
    expect(suscripcionActiva(sus(), ACTUAL)).toBe(true);
    expect(suscripcionActiva(sus({ hasta: '2026-10' }), ACTUAL)).toBe(true);
    expect(suscripcionActiva(sus({ hasta: '2026-09' }), ACTUAL)).toBe(false);
    expect(puedeAsignarPlan(undefined, ACTUAL)).toBe(true);
    expect(puedeAsignarPlan(sus({ hasta: '2026-09' }), ACTUAL)).toBe(false);
  });

  it('atrasado: paga menos que el precio vigente del plan', () => {
    expect(estaAtrasado(sus(), [{ id: 'p1', precio: '14900' }], ACTUAL)).toBe(false);
    expect(estaAtrasado(sus(), [{ id: 'p1', precio: '16000' }], ACTUAL)).toBe(true);
    expect(estaAtrasado(sus({ planId: null }), [{ id: 'p1', precio: '16000' }], ACTUAL)).toBe(
      false,
    );
  });

  it('baja hoy: el mes vencido, o el alta si empezó después; null si ya no cambia nada', () => {
    expect(periodoBajaHoy(sus(), ACTUAL)).toBe('2026-10');
    expect(periodoBajaHoy(sus({ desde: '2026-11' }), ACTUAL)).toBe('2026-11');
    expect(periodoBajaHoy(sus({ hasta: '2026-08' }), ACTUAL)).toBeNull();
    expect(periodoBajaHoy(undefined, ACTUAL)).toBeNull();
  });

  it('asignar plan: alta al precio del plan, o cambio de plan con o sin precio nuevo', () => {
    const plan = { id: 'p2', precio: '20000' };
    expect(conPlan(undefined, plan, false, ACTUAL)).toEqual({
      planId: 'p2',
      desde: ACTUAL,
      hasta: null,
      historial: [{ monto: '20000.00', desde: ACTUAL }],
    });
    expect(conPlan(sus(), plan, false, ACTUAL).historial).toEqual(sus().historial);
    expect(conPlan(sus(), plan, true, ACTUAL).historial.at(-1)).toEqual({
      monto: '20000.00',
      desde: ACTUAL,
    });
    // Si todavía no empezó, el precio rige desde el alta.
    expect(
      conPlan(
        sus({ desde: '2027-01', historial: [{ monto: '1.00', desde: '2027-01' }] }),
        plan,
        true,
        ACTUAL,
      ).historial,
    ).toEqual([{ monto: '20000.00', desde: '2027-01' }]);
  });

  it('valida una suscripción completa', () => {
    expect(errorSuscripcion(sus())).toBeNull();
    expect(errorSuscripcion(sus({ hasta: '2026-01' }))).toMatch(/baja/);
    expect(errorSuscripcion(sus({ historial: [] }))).toMatch(/al menos/);
    expect(
      errorSuscripcion(
        sus({
          historial: [
            { monto: '1', desde: '2026-03' },
            { monto: '2', desde: '2026-03' },
          ],
        }),
      ),
    ).toMatch(/mismo mes/);
    expect(errorSuscripcion(sus({ historial: [{ monto: '-1', desde: '2026-03' }] }))).toMatch(
      /negativos/,
    );
  });
});

describe('clientes y brokers', () => {
  it('baja lógica', () => {
    expect(clienteHabilitado({ deshabilitadoEn: null })).toBe(true);
    expect(clienteHabilitado({ deshabilitadoEn: new Date() })).toBe(false);
  });

  it('separa y normaliza brokers (alias, acentos, duplicados)', () => {
    expect(separarBrokers('BMB y IOL / Balanz + Cocos')).toEqual(['BMB', 'IOL', 'Balanz', 'Cocos']);
    expect(
      normalizarBrokers(['invertir online', 'IOL', 'Balanz Capital', 'cocos'], ['Cocos']),
    ).toEqual(['IOL', 'Balanz', 'Cocos']);
    expect(brokersDeDatos({ brokers: ['BMB', 3, 'bmb'] })).toEqual(['BMB']);
    expect(brokersDeDatos({ broker: 'BMB y Invertir Online' })).toEqual(['BMB', 'IOL']);
    expect(mismoBroker('Bálanz', 'balanz')).toBe(true);
  });
});
