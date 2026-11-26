import type { ActualizarCuenta, CrearCuenta } from '@efe/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { actualizarCuenta, borrarCuenta, crearCuenta, listarCuentas } from './api';

export const claveCuentas = ['cuentas'] as const;

export function useCuentas() {
  return useQuery({ queryKey: claveCuentas, queryFn: listarCuentas });
}

/** Después de cualquier cambio en cuentas se recargan (y lo que depende de los saldos). */
function useInvalidarCuentas() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: claveCuentas });
}

export function useCrearCuenta() {
  const invalidar = useInvalidarCuentas();
  return useMutation({
    mutationFn: (datos: CrearCuenta) => crearCuenta(datos),
    onSuccess: invalidar,
  });
}

export function useActualizarCuenta() {
  const invalidar = useInvalidarCuentas();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarCuenta }) =>
      actualizarCuenta(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarCuenta() {
  const invalidar = useInvalidarCuentas();
  return useMutation({ mutationFn: (id: string) => borrarCuenta(id), onSuccess: invalidar });
}
