import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/**
 * Recurso inexistente o de otro usuario. Siempre 404 (nunca 403) para no revelar que existe.
 */
export function noEncontrado(mensaje: string): AppException {
  return new AppException('NO_ENCONTRADO', mensaje, HttpStatus.NOT_FOUND);
}

/** El body es válido en forma, pero viola una regla de negocio (422). */
export function noProcesable(code: string, mensaje: string, details?: unknown): AppException {
  return new AppException(code, mensaje, HttpStatus.UNPROCESSABLE_ENTITY, details);
}

export function conflicto(code: string, mensaje: string, details?: unknown): AppException {
  return new AppException(code, mensaje, HttpStatus.CONFLICT, details);
}
