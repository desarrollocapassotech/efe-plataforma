import { hoy, periodoDe, sumarDias, sumarPeriodos } from '@efe/shared/fechas';
import type { CodigoIndicador } from '@efe/shared/indicadores';
import { useQuery } from '@tanstack/react-query';
import { obtenerHistorico, obtenerIndicadores } from './api';

/** La API los cachea 5 minutos: no tiene sentido pedirlos más seguido. */
const CINCO_MINUTOS = 5 * 60_000;

export function useIndicadores() {
  return useQuery({
    queryKey: ['indicadores'],
    queryFn: obtenerIndicadores,
    staleTime: CINCO_MINUTOS,
  });
}

/** Dólares: últimos 30 días. IPC: últimos 12 meses. */
export function useHistorico(codigo: CodigoIndicador) {
  const hasta = hoy();
  const desde =
    codigo === 'IPC_MENSUAL' ? `${sumarPeriodos(periodoDe(hasta), -11)}-01` : sumarDias(hasta, -30);
  return useQuery({
    queryKey: ['indicadores', 'historico', codigo, desde],
    queryFn: () => obtenerHistorico(codigo, desde, hasta),
    staleTime: CINCO_MINUTOS,
  });
}
