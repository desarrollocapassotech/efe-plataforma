import type {
  ActualizarCompra,
  ActualizarTarjeta,
  CierreTarjeta,
  CrearCompra,
  CrearPagoResumen,
  CrearTarjeta,
} from '@efe/shared/schemas';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  actualizarCompra,
  actualizarTarjeta,
  borrarCierre,
  borrarCompra,
  borrarPago,
  borrarTarjeta,
  crearCompra,
  crearPago,
  crearTarjeta,
  guardarCierre,
  listarTarjetas,
  obtenerCompromisos,
  obtenerResumen,
} from './api';

export const claveTarjetas = ['tarjetas'] as const;

export function useTarjetas() {
  return useQuery({ queryKey: claveTarjetas, queryFn: listarTarjetas });
}

export function useResumenTarjeta(tarjetaId: string, periodo?: string) {
  return useQuery({
    queryKey: [...claveTarjetas, 'resumen', tarjetaId, periodo ?? 'proximo'],
    queryFn: () => obtenerResumen(tarjetaId, periodo),
    placeholderData: keepPreviousData,
  });
}

export function useCompromisos(meses: number, habilitado = true) {
  return useQuery({
    queryKey: [...claveTarjetas, 'compromisos', meses],
    queryFn: () => obtenerCompromisos(meses),
    enabled: habilitado,
  });
}

/**
 * Lo que cambia con tarjetas: sus listas y resúmenes, el resumen mensual (las cuotas son
 * gasto del mes) y, con los pagos, el saldo de las cuentas.
 */
function useInvalidarTarjetas() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [claveTarjetas, ['resumen'], ['cuentas']].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

export function useCrearTarjeta() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({ mutationFn: (d: CrearTarjeta) => crearTarjeta(d), onSuccess: invalidar });
}

export function useActualizarTarjeta() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarTarjeta }) =>
      actualizarTarjeta(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarTarjeta() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({ mutationFn: (id: string) => borrarTarjeta(id), onSuccess: invalidar });
}

export function useGuardarCierre() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({
    mutationFn: (v: { tarjetaId: string; periodo: string; datos: CierreTarjeta }) =>
      guardarCierre(v.tarjetaId, v.periodo, v.datos),
    onSuccess: invalidar,
  });
}

export function useBorrarCierre() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({
    mutationFn: (v: { tarjetaId: string; periodo: string }) => borrarCierre(v.tarjetaId, v.periodo),
    onSuccess: invalidar,
  });
}

export function useCrearCompra() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({ mutationFn: (d: CrearCompra) => crearCompra(d), onSuccess: invalidar });
}

export function useActualizarCompra() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarCompra }) =>
      actualizarCompra(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarCompra() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({ mutationFn: (id: string) => borrarCompra(id), onSuccess: invalidar });
}

export function useCrearPago() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({ mutationFn: (d: CrearPagoResumen) => crearPago(d), onSuccess: invalidar });
}

export function useBorrarPago() {
  const invalidar = useInvalidarTarjetas();
  return useMutation({ mutationFn: (id: string) => borrarPago(id), onSuccess: invalidar });
}
