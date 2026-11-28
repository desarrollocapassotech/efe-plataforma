/**
 * Cliente de la API de la plataforma EFE (@efe/api) para los módulos nuevos del admin
 * (usuarios de la plataforma, métricas, indicadores, auditoría). Igual que Faktia: sin
 * API key, cada llamada va con el ID token de Firebase del usuario logueado. La API
 * exige rol ADMIN en estos endpoints (seed de admins, paso 1.4).
 */
import { auth } from '@/lib/firebase';

export const API_EFE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
export const apiEfeConfigurada = Boolean(API_EFE_URL);

export class ApiEfeError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiEfeError';
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

/** Arma "?a=1&b=2" salteando los vacíos. */
export function query(params: Query): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const texto = sp.toString();
  return texto ? `?${texto}` : '';
}

export async function apiEfe<T>(
  ruta: string,
  opciones: { method?: 'GET' | 'PATCH' | 'PUT' | 'POST'; body?: unknown } = {},
): Promise<T> {
  if (!apiEfeConfigurada) {
    throw new ApiEfeError(0, 'NO_CONFIGURADA', 'Falta configurar VITE_API_URL en el admin.');
  }
  const pedir = async (forzar: boolean) => {
    const token = await auth.currentUser?.getIdToken(forzar);
    return fetch(`${API_EFE_URL}${ruta}`, {
      method: opciones.method ?? 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opciones.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
    });
  };
  let respuesta: Response;
  try {
    respuesta = await pedir(false);
    if (respuesta.status === 401) respuesta = await pedir(true);
  } catch {
    throw new ApiEfeError(0, 'SIN_CONEXION', 'No pudimos conectarnos con la API de la plataforma.');
  }
  const datos: unknown = await respuesta.json().catch(() => null);
  if (respuesta.ok) return datos as T;
  const error = (datos as { error?: { code?: string; message?: string } } | null)?.error;
  if (respuesta.status === 403 && error?.code === 'PROHIBIDO') {
    throw new ApiEfeError(
      403,
      'PROHIBIDO',
      'Tu usuario no tiene rol de administrador en la plataforma.',
    );
  }
  throw new ApiEfeError(
    respuesta.status,
    error?.code ?? 'ERROR',
    error?.message ?? 'Ocurrió un error inesperado.',
  );
}
