import type { ActualizarCategoria, CrearCategoria, OrdenCategorias } from '@efe/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarCategoria,
  borrarCategoria,
  crearCategoria,
  listarCategorias,
  ordenarCategorias,
} from './api';

export const claveCategorias = ['categorias'] as const;

export function useCategorias() {
  return useQuery({ queryKey: claveCategorias, queryFn: listarCategorias });
}

function useInvalidarCategorias() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: claveCategorias });
}

export function useCrearCategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: (datos: CrearCategoria) => crearCategoria(datos),
    onSuccess: invalidar,
  });
}

export function useActualizarCategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarCategoria }) =>
      actualizarCategoria(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarCategoria() {
  const invalidar = useInvalidarCategorias();
  return useMutation({ mutationFn: (id: string) => borrarCategoria(id), onSuccess: invalidar });
}

export function useOrdenarCategorias() {
  const invalidar = useInvalidarCategorias();
  return useMutation({
    mutationFn: (items: OrdenCategorias) => ordenarCategorias(items),
    onSuccess: invalidar,
  });
}
