import { esPeriodoValido, hoy, periodoDe, type Periodo } from '@efe/shared/fechas';

export type TipoFiltro = 'GASTO' | 'INGRESO' | 'TRANSFERENCIA';

/** Filtros de la lista de movimientos. Viven en la URL: se pueden compartir y volver atrás. */
export interface FiltrosLista {
  mes: Periodo;
  tipo?: TipoFiltro;
  cuentaId?: string;
  categoriaId?: string;
  q?: string;
}

const TIPOS: TipoFiltro[] = ['GASTO', 'INGRESO', 'TRANSFERENCIA'];

export function leerFiltros(sp: URLSearchParams, hoyFecha: string = hoy()): FiltrosLista {
  const mes = sp.get('mes');
  const tipo = sp.get('tipo') as TipoFiltro | null;
  return {
    mes: mes && esPeriodoValido(mes) ? mes : periodoDe(hoyFecha),
    tipo: tipo && TIPOS.includes(tipo) ? tipo : undefined,
    cuentaId: sp.get('cuenta') || undefined,
    categoriaId: sp.get('categoria') || undefined,
    q: sp.get('q')?.trim() || undefined,
  };
}

export function aParametros(f: FiltrosLista): URLSearchParams {
  const sp = new URLSearchParams({ mes: f.mes });
  if (f.tipo) sp.set('tipo', f.tipo);
  if (f.cuentaId) sp.set('cuenta', f.cuentaId);
  if (f.categoriaId) sp.set('categoria', f.categoriaId);
  if (f.q) sp.set('q', f.q);
  return sp;
}

/** Link a la lista de movimientos con filtros (lo usa el dashboard). */
export function linkMovimientos(f: FiltrosLista): string {
  return `/movimientos?${aParametros(f).toString()}`;
}

export const cantidadFiltros = (f: FiltrosLista) =>
  [f.tipo, f.cuentaId, f.categoriaId, f.q].filter(Boolean).length;
