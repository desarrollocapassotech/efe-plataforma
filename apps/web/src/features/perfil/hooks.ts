import type { Feature } from '@efe/shared/features';
import type { ActualizarMe } from '@efe/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import { actualizarMe, obtenerMe } from './api';

export const claveMe = ['me'] as const;

/** Usuario de la plataforma (GET /me). La primera llamada crea el usuario en la API. */
export function useMe() {
  const { usuario } = useAuth();
  return useQuery({ queryKey: claveMe, queryFn: obtenerMe, enabled: usuario !== null });
}

export function useActualizarMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: ActualizarMe) => actualizarMe(datos),
    onSuccess: (me) => queryClient.setQueryData(claveMe, me),
  });
}

/** true si el plan del usuario incluye la feature (para mostrar, ocultar u ofrecer upgrade). */
export function useFeature(feature: Feature): boolean {
  const { data } = useMe();
  return data?.features.includes(feature) ?? false;
}
