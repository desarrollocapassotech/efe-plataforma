import type { ActualizarObjetivo, CrearAporte, CrearObjetivo } from '@efe/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarObjetivo,
  borrarAporte,
  borrarObjetivo,
  crearAporte,
  crearObjetivo,
  listarObjetivos,
  obtenerObjetivo,
} from './api';

export const claveObjetivos = ['objetivos'] as const;

export function useObjetivos(habilitado = true) {
  return useQuery({ queryKey: claveObjetivos, queryFn: listarObjetivos, enabled: habilitado });
}

export function useObjetivo(id: string) {
  return useQuery({ queryKey: [...claveObjetivos, id], queryFn: () => obtenerObjetivo(id) });
}

function useInvalidarObjetivos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: claveObjetivos });
}

export function useCrearObjetivo() {
  const invalidar = useInvalidarObjetivos();
  return useMutation({ mutationFn: (d: CrearObjetivo) => crearObjetivo(d), onSuccess: invalidar });
}

export function useActualizarObjetivo() {
  const invalidar = useInvalidarObjetivos();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarObjetivo }) =>
      actualizarObjetivo(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarObjetivo() {
  const invalidar = useInvalidarObjetivos();
  return useMutation({ mutationFn: (id: string) => borrarObjetivo(id), onSuccess: invalidar });
}

export function useCrearAporte() {
  const invalidar = useInvalidarObjetivos();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: CrearAporte }) => crearAporte(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarAporte() {
  const invalidar = useInvalidarObjetivos();
  return useMutation({
    mutationFn: ({ id, aporteId }: { id: string; aporteId: string }) => borrarAporte(id, aporteId),
    onSuccess: invalidar,
  });
}
