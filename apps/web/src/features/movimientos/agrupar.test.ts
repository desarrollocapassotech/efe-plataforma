import type { Movimiento, Transferencia } from '@efe/shared/schemas';
import { describe, expect, it } from 'vitest';
import { agruparPorDia } from './agrupar';

const cuenta = { id: 'c1', nombre: 'Efectivo', tipo: 'EFECTIVO' as const, moneda: 'ARS' as const };
const dolares = { id: 'c2', nombre: 'Dólares', tipo: 'EFECTIVO' as const, moneda: 'USD' as const };

function mov(
  id: string,
  fecha: string,
  tipo: 'GASTO' | 'INGRESO',
  monto: string,
  usd = false,
): Movimiento {
  return {
    id,
    tipo,
    monto,
    moneda: usd ? 'USD' : 'ARS',
    fecha,
    descripcion: null,
    cuenta: usd ? dolares : cuenta,
    categoria: null,
    recurrenciaId: null,
    creadoEn: `${fecha}T12:00:00.000Z`,
  };
}

function trf(id: string, fecha: string): Transferencia {
  return {
    id,
    cuentaOrigen: cuenta,
    cuentaDestino: dolares,
    montoOrigen: '1000.00',
    montoDestino: '1.00',
    cotizacion: '1000.00',
    fecha,
    descripcion: null,
    creadoEn: `${fecha}T13:00:00.000Z`,
  };
}

describe('agruparPorDia', () => {
  it('agrupa por día, del más nuevo al más viejo, con el neto por moneda', () => {
    const dias = agruparPorDia(
      [
        mov('a', '2026-11-20', 'GASTO', '100.50'),
        mov('b', '2026-11-26', 'GASTO', '300.00'),
        mov('c', '2026-11-26', 'INGRESO', '1000.00'),
        mov('d', '2026-11-26', 'GASTO', '5.00', true),
      ],
      [trf('t', '2026-11-26')],
    );
    expect(dias.map((d) => d.fecha)).toEqual(['2026-11-26', '2026-11-20']);
    expect(dias[0]!.items).toHaveLength(4);
    expect(dias[0]!.totales).toEqual([
      { moneda: 'ARS', neto: '700.00' },
      { moneda: 'USD', neto: '-5.00' },
    ]);
    expect(dias[1]!.totales).toEqual([{ moneda: 'ARS', neto: '-100.50' }]);
  });

  it('un día con solo transferencias no tiene totales', () => {
    const dias = agruparPorDia([], [trf('t', '2026-11-10')]);
    expect(dias).toEqual([expect.objectContaining({ fecha: '2026-11-10', totales: [] })]);
  });

  it('guarda las transferencias más viejas que lo cargado', () => {
    const dias = agruparPorDia(
      [mov('a', '2026-11-20', 'GASTO', '1')],
      [trf('t', '2026-11-05')],
      '2026-11-20',
    );
    expect(dias.map((d) => d.fecha)).toEqual(['2026-11-20']);
  });
});
