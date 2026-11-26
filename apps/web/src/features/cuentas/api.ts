import type { ActualizarCuenta, CrearCuenta, Cuenta } from '@efe/shared/schemas';
import { api } from '@/lib/api';

/** Todas las cuentas, incluidas las archivadas (la pantalla las separa). */
export const listarCuentas = () => api<Cuenta[]>('/cuentas?incluirArchivadas=true');

export const crearCuenta = (datos: CrearCuenta) =>
  api<Cuenta>('/cuentas', { method: 'POST', body: datos });

export const actualizarCuenta = (id: string, datos: ActualizarCuenta) =>
  api<Cuenta>(`/cuentas/${id}`, { method: 'PATCH', body: datos });

export const borrarCuenta = (id: string) => api<void>(`/cuentas/${id}`, { method: 'DELETE' });
