import { ApiError } from './api-error';

export interface OpcionesApi {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

/** Devuelve el ID token del usuario actual (forzando refresco si se pide), o null. */
export type ObtenerToken = (forzarRefresco: boolean) => Promise<string | null>;

interface CuerpoError {
  error?: { code?: string; message?: string; details?: unknown };
}

/**
 * Crea el cliente de la API: agrega el ID token de Firebase, convierte las respuestas de
 * error en ApiError y, si la API responde 401, reintenta una vez con el token refrescado.
 */
export function crearApiClient(baseUrl: string, obtenerToken: ObtenerToken) {
  async function pedir(ruta: string, opciones: OpcionesApi, forzarRefresco: boolean) {
    const token = await obtenerToken(forzarRefresco);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opciones.body !== undefined) headers['Content-Type'] = 'application/json';
    try {
      return await fetch(`${baseUrl}${ruta}`, {
        method: opciones.method ?? 'GET',
        headers,
        body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
        signal: opciones.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError(
        0,
        'SIN_CONEXION',
        'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
      );
    }
  }

  return async function api<T>(ruta: string, opciones: OpcionesApi = {}): Promise<T> {
    let respuesta = await pedir(ruta, opciones, false);
    if (respuesta.status === 401) respuesta = await pedir(ruta, opciones, true);

    if (respuesta.status === 204) return undefined as T;

    const datos: unknown = await respuesta.json().catch(() => null);
    if (respuesta.ok) return datos as T;

    const error = (datos as CuerpoError | null)?.error;
    throw new ApiError(
      respuesta.status,
      error?.code ?? 'ERROR_INESPERADO',
      error?.message ?? 'Ocurrió un error inesperado. Probá de nuevo.',
      error?.details,
    );
  };
}
