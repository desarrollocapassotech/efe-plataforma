import type {
  ActualizarMovimiento,
  ActualizarTransferencia,
  CategoriaResumida,
  CrearMovimiento,
  CrearTransferencia,
  CuentaResumida,
  Movimiento,
  Pagina,
} from '@efe/shared/schemas';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  actualizarMovimiento,
  actualizarTransferencia,
  borrarMovimiento,
  borrarTransferencia,
  crearMovimiento,
  crearTransferencia,
  listarMovimientos,
  listarTransferencias,
  type FiltrosMovimientos,
} from './api';

export const claveMovimientos = ['movimientos'] as const;
export const claveTransferencias = ['transferencias'] as const;

/** Movimientos con scroll infinito (cursor de la API). */
export function useMovimientos(filtros: FiltrosMovimientos, habilitado = true) {
  return useInfiniteQuery({
    queryKey: [...claveMovimientos, filtros],
    queryFn: ({ pageParam }) => listarMovimientos(filtros, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (ultima) => ultima.nextCursor,
    enabled: habilitado,
  });
}

export function useTransferencias(
  filtros: { desde?: string; hasta?: string; cuentaId?: string },
  habilitado = true,
) {
  return useQuery({
    queryKey: [...claveTransferencias, filtros],
    queryFn: () => listarTransferencias(filtros),
    enabled: habilitado,
  });
}

/**
 * Cualquier cambio de plata afecta listas, saldos de cuentas, resúmenes y (si vino de una
 * recurrencia) la lista de recurrentes: se recarga todo eso.
 */
export function useInvalidarFinanzas() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [claveMovimientos, claveTransferencias, ['cuentas'], ['resumen'], ['recurrencias']].map(
        (queryKey) => queryClient.invalidateQueries({ queryKey }),
      ),
    );
}

/** ¿El movimiento entra en una lista con estos filtros? (para el alta optimista). */
export function coincideConFiltros(m: Movimiento, f: FiltrosMovimientos): boolean {
  if (f.q) return false; // La búsqueda la resuelve la API.
  if (f.desde && m.fecha < f.desde) return false;
  if (f.hasta && m.fecha > f.hasta) return false;
  if (f.tipo && m.tipo !== f.tipo) return false;
  if (f.cuentaId && m.cuenta.id !== f.cuentaId) return false;
  if (f.categoriaId && m.categoria?.id !== f.categoriaId) return false;
  return true;
}

export interface NuevoMovimiento {
  datos: CrearMovimiento;
  /** Para mostrarlo en la lista antes de que responda la API. */
  cuenta: CuentaResumida;
  categoria: CategoriaResumida | null;
}

type CacheMovimientos = InfiniteData<Pagina<Movimiento>, string | null>;

/**
 * Alta con actualización optimista: el movimiento aparece en las listas apenas se toca
 * Guardar; si la API falla, se saca y se avisa.
 */
export function useCrearMovimiento() {
  const queryClient = useQueryClient();
  const invalidar = useInvalidarFinanzas();
  return useMutation({
    mutationFn: ({ datos }: NuevoMovimiento) => crearMovimiento(datos),
    onMutate: async ({ datos, cuenta, categoria }) => {
      await queryClient.cancelQueries({ queryKey: claveMovimientos });
      const anteriores = queryClient.getQueriesData<CacheMovimientos>({
        queryKey: claveMovimientos,
      });
      const provisorio: Movimiento = {
        id: `provisorio-${Date.now()}`,
        tipo: datos.tipo,
        monto: datos.monto,
        moneda: cuenta.moneda,
        fecha: datos.fecha,
        descripcion: datos.descripcion ?? null,
        cuenta,
        categoria,
        recurrenciaId: null,
        creadoEn: new Date().toISOString(),
      };
      for (const [clave, data] of anteriores) {
        const filtros = (clave[1] ?? {}) as FiltrosMovimientos;
        if (!data?.pages[0] || !coincideConFiltros(provisorio, filtros)) continue;
        const [primera, ...resto] = data.pages;
        const items = [provisorio, ...primera.items].sort((a, b) =>
          a.fecha === b.fecha ? 0 : a.fecha < b.fecha ? 1 : -1,
        );
        queryClient.setQueryData<CacheMovimientos>(clave, {
          ...data,
          pages: [{ ...primera, items }, ...resto],
        });
      }
      return { anteriores };
    },
    onError: (error, _vars, contexto) => {
      // El panel ya se cerró: se avisa con un toast y se saca de la lista.
      toast.error(`No pudimos guardar el movimiento: ${error.message}`);
      for (const [clave, data] of contexto?.anteriores ?? []) queryClient.setQueryData(clave, data);
    },
    onSettled: invalidar,
  });
}

export function useActualizarMovimiento() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarMovimiento }) =>
      actualizarMovimiento(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarMovimiento() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({ mutationFn: (id: string) => borrarMovimiento(id), onSuccess: invalidar });
}

export function useCrearTransferencia() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({
    mutationFn: (datos: CrearTransferencia) => crearTransferencia(datos),
    onSuccess: invalidar,
  });
}

export function useActualizarTransferencia() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActualizarTransferencia }) =>
      actualizarTransferencia(id, datos),
    onSuccess: invalidar,
  });
}

export function useBorrarTransferencia() {
  const invalidar = useInvalidarFinanzas();
  return useMutation({
    mutationFn: (id: string) => borrarTransferencia(id),
    onSuccess: invalidar,
  });
}
