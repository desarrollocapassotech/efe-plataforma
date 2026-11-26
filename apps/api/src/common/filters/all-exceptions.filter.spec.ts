import { HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import { AppException } from '../errors/app.exception';
import { mapearExcepcion } from './all-exceptions.filter';

const errorPrisma = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' });

describe('mapearExcepcion', () => {
  it('AppException conserva código, mensaje, status y details', () => {
    const r = mapearExcepcion(
      new AppException('CUENTA_CON_MOVIMIENTOS', 'La cuenta tiene movimientos', 409, { n: 3 }),
    );
    expect(r).toEqual({
      status: 409,
      cuerpo: {
        error: {
          code: 'CUENTA_CON_MOVIMIENTOS',
          message: 'La cuenta tiene movimientos',
          details: { n: 3 },
        },
      },
    });
  });

  it('AppException sin details no agrega la clave', () => {
    const r = mapearExcepcion(new AppException('X', 'y'));
    expect(r.status).toBe(400);
    expect(r.cuerpo.error).not.toHaveProperty('details');
  });

  it('error de validación zod → 400 VALIDACION con los issues', () => {
    const resultado = z.object({ monto: z.string() }).safeParse({ monto: 1 });
    const r = mapearExcepcion(new ZodValidationException(resultado.error));
    expect(r.status).toBe(400);
    expect(r.cuerpo.error.code).toBe('VALIDACION');
    expect(r.cuerpo.error.details).toEqual([
      expect.objectContaining({ path: 'monto', code: 'invalid_type' }),
    ]);
  });

  it('HttpException de Nest → código por status', () => {
    expect(mapearExcepcion(new NotFoundException()).cuerpo.error.code).toBe('NO_ENCONTRADO');
    expect(mapearExcepcion(new UnauthorizedException()).cuerpo.error.code).toBe('NO_AUTENTICADO');
  });

  it('throttler → 429', () => {
    const r = mapearExcepcion(new ThrottlerException());
    expect(r.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(r.cuerpo.error.code).toBe('DEMASIADAS_SOLICITUDES');
  });

  it('Prisma P2002 → 409 CONFLICTO y P2025 → 404 NO_ENCONTRADO', () => {
    expect(mapearExcepcion(errorPrisma('P2002'))).toMatchObject({
      status: 409,
      cuerpo: { error: { code: 'CONFLICTO' } },
    });
    expect(mapearExcepcion(errorPrisma('P2025'))).toMatchObject({
      status: 404,
      cuerpo: { error: { code: 'NO_ENCONTRADO' } },
    });
  });

  it('cualquier otro error → 500 sin filtrar el mensaje interno', () => {
    const r = mapearExcepcion(new Error('detalle interno con secreto'));
    expect(r.status).toBe(500);
    expect(r.cuerpo.error).toEqual({
      code: 'ERROR_INTERNO',
      message: 'Ocurrió un error inesperado',
    });
    expect(mapearExcepcion(errorPrisma('P1001')).status).toBe(500);
  });
});
