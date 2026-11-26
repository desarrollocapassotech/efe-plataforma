import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearApiClient } from './api-client';
import { ApiError } from './api-error';

const respuesta = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => vi.restoreAllMocks());

describe('apiClient', () => {
  it('agrega el ID token y parsea el JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(200, { ok: 1 }));
    const api = crearApiClient('http://api', async () => 'tok');
    await expect(api('/me')).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api/me');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('manda el body como JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(200, {}));
    const api = crearApiClient('http://api', async () => 'tok');
    await api('/me', { method: 'PATCH', body: { nombre: 'x' } });
    const init = fetchMock.mock.calls[0]![1]!;
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe('{"nombre":"x"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('convierte { error: { code, message } } en ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      respuesta(409, { error: { code: 'CUENTA_CON_MOVIMIENTOS', message: 'Tiene movimientos' } }),
    );
    const api = crearApiClient('http://api', async () => 'tok');
    const error = await api('/cuentas/1').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CUENTA_CON_MOVIMIENTOS' });
    expect((error as ApiError).message).toBe('Tiene movimientos');
  });

  it('si responde 401 reintenta una vez con el token refrescado', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(respuesta(401, { error: { code: 'TOKEN_INVALIDO', message: 'x' } }))
      .mockResolvedValueOnce(respuesta(200, { ok: true }));
    const obtenerToken = vi.fn(async (forzar: boolean) => (forzar ? 'nuevo' : 'viejo'));
    const api = crearApiClient('http://api', obtenerToken);

    await expect(api('/me')).resolves.toEqual({ ok: true });
    expect(obtenerToken.mock.calls).toEqual([[false], [true]]);
    const auth = (i: number) =>
      (fetchMock.mock.calls[i]![1]!.headers as Record<string, string>).Authorization;
    expect(auth(0)).toBe('Bearer viejo');
    expect(auth(1)).toBe('Bearer nuevo');
  });

  it('si el reintento también da 401, tira ApiError (no reintenta de nuevo)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(respuesta(401, { error: { code: 'TOKEN_INVALIDO', message: 'x' } }));
    const api = crearApiClient('http://api', async () => 'tok');
    await expect(api('/me')).rejects.toMatchObject({ status: 401, code: 'TOKEN_INVALIDO' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sin conexión → ApiError SIN_CONEXION', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const api = crearApiClient('http://api', async () => 'tok');
    await expect(api('/me')).rejects.toMatchObject({ status: 0, code: 'SIN_CONEXION' });
  });

  it('error sin cuerpo JSON → ERROR_INESPERADO', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>', { status: 502 }));
    const api = crearApiClient('http://api', async () => 'tok');
    await expect(api('/me')).rejects.toMatchObject({ status: 502, code: 'ERROR_INESPERADO' });
  });

  it('204 devuelve undefined', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const api = crearApiClient('http://api', async () => 'tok');
    await expect(api('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
