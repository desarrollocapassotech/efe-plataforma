import { createHash, timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../../common/errors/app.exception';
import { ConfigService } from '../../config/config.service';

export const HEADER_JOBS_SECRET = 'x-jobs-secret';

/** Compara dos secretos en tiempo constante (hashea primero para igualar el largo). */
export function secretosIguales(recibido: string, esperado: string): boolean {
  const a = createHash('sha256').update(recibido).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

/**
 * Protege /internal/jobs/*: exige el header X-Jobs-Secret igual a JOBS_SECRET.
 * Sin JOBS_SECRET configurado, rechaza todo (en producción es obligatorio).
 */
@Injectable()
export class JobsSecretGuard implements CanActivate {
  private readonly logger = new Logger(JobsSecretGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const esperado = this.config.get('JOBS_SECRET');
    const recibido = context.switchToHttp().getRequest<Request>().header(HEADER_JOBS_SECRET);
    if (!esperado) this.logger.warn('JOBS_SECRET no está configurado: se rechazan los jobs');
    if (esperado && recibido && secretosIguales(recibido, esperado)) return true;
    throw new AppException('NO_AUTENTICADO', 'Secreto de jobs inválido', HttpStatus.UNAUTHORIZED);
  }
}
