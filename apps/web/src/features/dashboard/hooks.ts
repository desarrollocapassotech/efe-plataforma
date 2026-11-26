import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { obtenerEvolucion, obtenerResumenMensual } from './api';

// Bajo ['resumen']: cualquier alta/edición de movimientos lo invalida (useInvalidarFinanzas).

export function useResumenMensual(periodo: string) {
  return useQuery({
    queryKey: ['resumen', 'mensual', periodo],
    queryFn: () => obtenerResumenMensual(periodo),
    // Al cambiar de mes se ve el anterior atenuado hasta que llega el nuevo (sin saltos).
    placeholderData: keepPreviousData,
  });
}

export function useEvolucion(meses: number, hasta: string) {
  return useQuery({
    queryKey: ['resumen', 'evolucion', meses, hasta],
    queryFn: () => obtenerEvolucion(meses, hasta),
  });
}
