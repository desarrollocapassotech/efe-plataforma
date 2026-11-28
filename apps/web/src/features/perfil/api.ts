import { TERMINOS_VERSION, type ActualizarMe, type Me } from '@efe/shared/schemas';
import { api } from '@/lib/api';

export const obtenerMe = () => api<Me>('/me');

export const actualizarMe = (datos: ActualizarMe) =>
  api<Me>('/me', { method: 'PATCH', body: datos });

export const aceptarTerminos = () =>
  api<Me>('/me/terminos', { method: 'POST', body: { version: TERMINOS_VERSION } });

/** Todos los datos del usuario (JSON) para descargar. */
export const exportarDatos = () => api<unknown>('/me/exportar');

export const eliminarCuenta = () =>
  api<{ purgaEn: string }>('/me', { method: 'DELETE', body: { confirmacion: 'ELIMINAR' } });

export const restaurarCuenta = () => api<Me>('/me/restaurar', { method: 'POST' });
