import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import type { ZodError } from 'zod';
import { AppException } from '../errors/app.exception';

export interface CuerpoError {
  error: { code: string; message: string; details?: unknown };
}

const CODIGO_POR_STATUS: Record<number, string> = {
  400: 'SOLICITUD_INVALIDA',
  401: 'NO_AUTENTICADO',
  403: 'PROHIBIDO',
  404: 'NO_ENCONTRADO',
  405: 'METODO_NO_PERMITIDO',
  409: 'CONFLICTO',
  413: 'CONTENIDO_DEMASIADO_GRANDE',
  422: 'NO_PROCESABLE',
  429: 'DEMASIADAS_SOLICITUDES',
};

/** Convierte cualquier excepción en el formato estándar { error: { code, message, details? } }. */
export function mapearExcepcion(exception: unknown): { status: number; cuerpo: CuerpoError } {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      cuerpo: {
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details !== undefined && { details: exception.details }),
        },
      },
    };
  }

  if (exception instanceof ZodValidationException) {
    const zodError = exception.getZodError() as ZodError;
    return {
      status: HttpStatus.BAD_REQUEST,
      cuerpo: {
        error: {
          code: 'VALIDACION',
          message: 'Los datos enviados no son válidos',
          details: zodError.issues.map((i) => ({
            path: i.path.join('.'),
            code: i.code,
            message: i.message,
          })),
        },
      },
    };
  }

  if (exception instanceof ThrottlerException) {
    return {
      status: HttpStatus.TOO_MANY_REQUESTS,
      cuerpo: {
        error: {
          code: 'DEMASIADAS_SOLICITUDES',
          message: 'Demasiadas solicitudes. Probá de nuevo en un rato.',
        },
      },
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      status,
      cuerpo: {
        error: {
          code: CODIGO_POR_STATUS[status] ?? (status >= 500 ? 'ERROR_INTERNO' : 'ERROR'),
          message: exception.message,
        },
      },
    };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        cuerpo: { error: { code: 'CONFLICTO', message: 'Ya existe un registro con esos datos' } },
      };
    }
    if (exception.code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        cuerpo: { error: { code: 'NO_ENCONTRADO', message: 'No se encontró el recurso' } },
      };
    }
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    cuerpo: { error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado' } },
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, cuerpo } = mapearExcepcion(exception);
    if (status >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    res.status(status).json(cuerpo);
  }
}
