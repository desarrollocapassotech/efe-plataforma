import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { ErrorFuente } from './tipos';

export const TIMEOUT_MS = 10_000;

/**
 * GET de JSON a una fuente externa con timeout y validación zod de la respuesta: si el
 * formato cambia, falla de forma explícita (ErrorFuente) en lugar de guardar basura.
 */
@Injectable()
export class ClienteHttp {
  async obtenerJson<T extends z.ZodType>(
    fuente: string,
    url: string,
    schema: T,
    timeoutMs = TIMEOUT_MS,
  ): Promise<z.infer<T>> {
    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'efe-plataforma' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const motivo =
        error instanceof Error && error.name === 'TimeoutError'
          ? `no respondió en ${timeoutMs} ms`
          : `no se pudo conectar (${error instanceof Error ? error.message : String(error)})`;
      throw new ErrorFuente(fuente, motivo);
    }
    if (!respuesta.ok) throw new ErrorFuente(fuente, `respondió HTTP ${respuesta.status}`);
    let json: unknown;
    try {
      json = await respuesta.json();
    } catch {
      throw new ErrorFuente(fuente, 'la respuesta no es JSON');
    }
    const resultado = schema.safeParse(json);
    if (!resultado.success) {
      const detalle = resultado.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`)
        .join('; ');
      throw new ErrorFuente(fuente, `cambió el formato de la respuesta (${detalle})`);
    }
    return resultado.data;
  }
}
