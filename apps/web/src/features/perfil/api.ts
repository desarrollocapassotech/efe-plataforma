import type { ActualizarMe, Me } from '@efe/shared/schemas';
import { api } from '@/lib/api';

export const obtenerMe = () => api<Me>('/me');

export const actualizarMe = (datos: ActualizarMe) =>
  api<Me>('/me', { method: 'PATCH', body: datos });
