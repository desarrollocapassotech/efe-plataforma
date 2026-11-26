import type { ActualizarRecurrencia, CrearRecurrencia, Recurrencia } from '@efe/shared/schemas';
import { api } from '@/lib/api';

/** Todas, incluidas las pausadas (la pantalla las separa). */
export const listarRecurrencias = () => api<Recurrencia[]>('/recurrencias?incluirInactivas=true');

export const crearRecurrencia = (datos: CrearRecurrencia) =>
  api<Recurrencia>('/recurrencias', { method: 'POST', body: datos });

export const actualizarRecurrencia = (id: string, datos: ActualizarRecurrencia) =>
  api<Recurrencia>(`/recurrencias/${id}`, { method: 'PATCH', body: datos });

export const borrarRecurrencia = (id: string) =>
  api<void>(`/recurrencias/${id}`, { method: 'DELETE' });
