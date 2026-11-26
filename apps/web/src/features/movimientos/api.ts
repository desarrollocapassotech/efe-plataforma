import type {
  ActualizarMovimiento,
  ActualizarTransferencia,
  CrearMovimiento,
  CrearTransferencia,
  Movimiento,
  Pagina,
  TipoMovimiento,
  Transferencia,
} from '@efe/shared/schemas';
import { api } from '@/lib/api';

export interface FiltrosMovimientos {
  desde?: string;
  hasta?: string;
  tipo?: TipoMovimiento;
  cuentaId?: string;
  categoriaId?: string;
  q?: string;
}

function query(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== '') sp.set(clave, String(valor));
  }
  const texto = sp.toString();
  return texto ? `?${texto}` : '';
}

export const listarMovimientos = (filtros: FiltrosMovimientos, cursor?: string | null) =>
  api<Pagina<Movimiento>>(
    `/movimientos${query({ ...filtros, cursor: cursor ?? undefined, limit: 50 })}`,
  );

export const crearMovimiento = (datos: CrearMovimiento) =>
  api<Movimiento>('/movimientos', { method: 'POST', body: datos });

export const actualizarMovimiento = (id: string, datos: ActualizarMovimiento) =>
  api<Movimiento>(`/movimientos/${id}`, { method: 'PATCH', body: datos });

export const borrarMovimiento = (id: string) =>
  api<void>(`/movimientos/${id}`, { method: 'DELETE' });

/** Todas las transferencias de un rango (son pocas por mes: se recorren todas las páginas). */
export async function listarTransferencias(filtros: {
  desde?: string;
  hasta?: string;
  cuentaId?: string;
}): Promise<Transferencia[]> {
  const todas: Transferencia[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await api<Pagina<Transferencia>>(
      `/transferencias${query({ ...filtros, cursor, limit: 100 })}`,
    );
    todas.push(...pagina.items);
    cursor = pagina.nextCursor ?? undefined;
  } while (cursor);
  return todas;
}

export const crearTransferencia = (datos: CrearTransferencia) =>
  api<Transferencia>('/transferencias', { method: 'POST', body: datos });

export const actualizarTransferencia = (id: string, datos: ActualizarTransferencia) =>
  api<Transferencia>(`/transferencias/${id}`, { method: 'PATCH', body: datos });

export const borrarTransferencia = (id: string) =>
  api<void>(`/transferencias/${id}`, { method: 'DELETE' });
