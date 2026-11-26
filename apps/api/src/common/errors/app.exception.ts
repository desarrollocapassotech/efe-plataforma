import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error de negocio con código estable en MAYÚSCULAS (ej. CUENTA_CON_MOVIMIENTOS).
 * El filtro global lo convierte en { error: { code, message, details? } }.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
