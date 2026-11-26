import type {
  ActualizarCompra,
  ActualizarTarjeta,
  CierreTarjeta,
  Compra,
  Compromisos,
  CrearCompra,
  CrearPagoResumen,
  CrearTarjeta,
  PagoResumen,
  ResumenFechas,
  ResumenTarjeta,
  Tarjeta,
} from '@efe/shared/schemas';
import { api } from '@/lib/api';

/** Todas, incluidas las archivadas (la pantalla las separa). */
export const listarTarjetas = () => api<Tarjeta[]>('/tarjetas?incluirArchivadas=true');

export const crearTarjeta = (datos: CrearTarjeta) =>
  api<Tarjeta>('/tarjetas', { method: 'POST', body: datos });

export const actualizarTarjeta = (id: string, datos: ActualizarTarjeta) =>
  api<Tarjeta>(`/tarjetas/${id}`, { method: 'PATCH', body: datos });

export const borrarTarjeta = (id: string) => api<void>(`/tarjetas/${id}`, { method: 'DELETE' });

/** Resumen de una tarjeta (sin período: el próximo a vencer). */
export async function obtenerResumen(tarjetaId: string, periodo?: string) {
  const q = periodo ? `&periodo=${periodo}` : '';
  const lista = await api<ResumenTarjeta[]>(`/tarjetas/resumen?tarjetaId=${tarjetaId}${q}`);
  return lista[0] ?? null;
}

export const obtenerCompromisos = (meses: number) =>
  api<Compromisos>(`/tarjetas/compromisos?meses=${meses}`);

export const guardarCierre = (tarjetaId: string, periodo: string, datos: CierreTarjeta) =>
  api<ResumenFechas>(`/tarjetas/${tarjetaId}/cierres/${periodo}`, { method: 'PUT', body: datos });

export const borrarCierre = (tarjetaId: string, periodo: string) =>
  api<void>(`/tarjetas/${tarjetaId}/cierres/${periodo}`, { method: 'DELETE' });

export const crearCompra = (datos: CrearCompra) =>
  api<Compra>('/tarjetas/compras', { method: 'POST', body: datos });

export const actualizarCompra = (id: string, datos: ActualizarCompra) =>
  api<Compra>(`/tarjetas/compras/${id}`, { method: 'PATCH', body: datos });

export const borrarCompra = (id: string) =>
  api<void>(`/tarjetas/compras/${id}`, { method: 'DELETE' });

export const crearPago = (datos: CrearPagoResumen) =>
  api<PagoResumen>('/tarjetas/pagos', { method: 'POST', body: datos });

export const borrarPago = (id: string) => api<void>(`/tarjetas/pagos/${id}`, { method: 'DELETE' });
