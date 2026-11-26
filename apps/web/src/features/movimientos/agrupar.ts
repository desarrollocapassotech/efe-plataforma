import { aString2Decimales, MONEDAS, restar, sumar, type Moneda } from '@efe/shared/dinero';
import type { Movimiento, Transferencia } from '@efe/shared/schemas';

export type ItemLista =
  | { clase: 'movimiento'; movimiento: Movimiento }
  | { clase: 'transferencia'; transferencia: Transferencia };

export interface DiaLista {
  fecha: string;
  items: ItemLista[];
  /** Ingresos − gastos del día por moneda (las transferencias no cuentan). */
  totales: { moneda: Moneda; neto: string }[];
}

const fechaDe = (i: ItemLista) =>
  i.clase === 'movimiento' ? i.movimiento.fecha : i.transferencia.fecha;
const creadoDe = (i: ItemLista) =>
  i.clase === 'movimiento' ? i.movimiento.creadoEn : i.transferencia.creadoEn;

/**
 * Une movimientos y transferencias y los agrupa por día (más nuevo primero).
 * `desdeFecha`: con scroll infinito, las transferencias más viejas que el último
 * movimiento cargado se guardan para cuando llegue esa página (si no, aparecerían antes).
 */
export function agruparPorDia(
  movimientos: Movimiento[],
  transferencias: Transferencia[],
  desdeFecha?: string,
): DiaLista[] {
  const items: ItemLista[] = [
    ...movimientos.map((movimiento) => ({ clase: 'movimiento' as const, movimiento })),
    ...transferencias
      .filter((t) => !desdeFecha || t.fecha >= desdeFecha)
      .map((transferencia) => ({ clase: 'transferencia' as const, transferencia })),
  ].sort((a, b) => {
    const fa = fechaDe(a);
    const fb = fechaDe(b);
    if (fa !== fb) return fa < fb ? 1 : -1;
    const ca = creadoDe(a);
    const cb = creadoDe(b);
    return ca === cb ? 0 : ca < cb ? 1 : -1;
  });

  const dias: DiaLista[] = [];
  for (const item of items) {
    const fecha = fechaDe(item);
    let dia = dias.at(-1);
    if (!dia || dia.fecha !== fecha) {
      dia = { fecha, items: [], totales: [] };
      dias.push(dia);
    }
    dia.items.push(item);
  }

  for (const dia of dias) {
    dia.totales = MONEDAS.flatMap((moneda) => {
      const delDia = dia.items.flatMap((i) =>
        i.clase === 'movimiento' && i.movimiento.moneda === moneda ? [i.movimiento] : [],
      );
      if (delDia.length === 0) return [];
      const ingresos = sumar(0, ...delDia.filter((m) => m.tipo === 'INGRESO').map((m) => m.monto));
      const gastos = sumar(0, ...delDia.filter((m) => m.tipo === 'GASTO').map((m) => m.monto));
      return [{ moneda, neto: aString2Decimales(restar(ingresos, gastos)) }];
    });
  }
  return dias;
}
