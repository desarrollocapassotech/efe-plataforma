import type {
  ActualizarCategoria,
  Categoria,
  CrearCategoria,
  OrdenCategorias,
} from '@efe/shared/schemas';
import { api } from '@/lib/api';

/** Todas las categorías de los dos tipos, incluidas las archivadas (la pantalla las separa). */
export const listarCategorias = () => api<Categoria[]>('/categorias?incluirArchivadas=true');

export const crearCategoria = (datos: CrearCategoria) =>
  api<Categoria>('/categorias', { method: 'POST', body: datos });

export const actualizarCategoria = (id: string, datos: ActualizarCategoria) =>
  api<Categoria>(`/categorias/${id}`, { method: 'PATCH', body: datos });

export const borrarCategoria = (id: string) => api<void>(`/categorias/${id}`, { method: 'DELETE' });

export const ordenarCategorias = (items: OrdenCategorias) =>
  api<void>('/categorias/orden', { method: 'PUT', body: items });
