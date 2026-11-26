import type { ActualizarRecurrencia, CrearRecurrencia } from '@efe/shared/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidarFinanzas } from '@/features/movimientos/hooks';
import {
  actualizarRecurrencia,
  borrarRecurrencia,
  crearRecurrencia,
  listarRecurrencias,
} from './api';

export const claveRecurrencias = ['recurrencias'] as const;

export function useRecurrencias() {
  return useQuery({ queryKey: claveRecurrencias, queryFn: listarRecurrencias });
}

// Crear una recurrencia puede generar movimientos en el momento (hasta hoy): se recarga todo.

export function useCrearRecurrencia() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({
    mutationFn: (datos: CrearRecurrencia) => crearRecurrencia(datos),
    onSuccess: invalidar,
  });
}

export function useActualizarRecurrencia() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarRecurrencia }) =>
      actualizarRecurrencia(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarRecurrencia() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({ mutationFn: (id: string) => borrarRecurrencia(id), onSuccess: invalidar });
}
