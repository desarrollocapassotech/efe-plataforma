import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-error';

export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Un 4xx no se arregla reintentando (validación, permisos, no encontrado).
        retry: (intentos, error) =>
          !(error instanceof ApiError && error.esErrorDelCliente) && intentos < 2,
      },
      mutations: { retry: false },
    },
  });
}
