import type {
  ActualizarObjetivo,
  Aporte,
  CrearAporte,
  CrearObjetivo,
  Objetivo,
  ObjetivoDetalle,
} from '@efe/shared/schemas';
import { api } from '@/lib/api';

export const listarObjetivos = () => api<Objetivo[]>('/objetivos');

export const obtenerObjetivo = (id: string) => api<ObjetivoDetalle>(`/objetivos/${id}`);

export const crearObjetivo = (datos: CrearObjetivo) =>
  api<Objetivo>('/objetivos', { method: 'POST', body: datos });

export const actualizarObjetivo = (id: string, datos: ActualizarObjetivo) =>
  api<Objetivo>(`/objetivos/${id}`, { method: 'PATCH', body: datos });

export const borrarObjetivo = (id: string) => api<void>(`/objetivos/${id}`, { method: 'DELETE' });

export const crearAporte = (id: string, datos: CrearAporte) =>
  api<Aporte>(`/objetivos/${id}/aportes`, { method: 'POST', body: datos });

export const borrarAporte = (id: string, aporteId: string) =>
  api<void>(`/objetivos/${id}/aportes/${aporteId}`, { method: 'DELETE' });
