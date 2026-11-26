import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '../../config/config.service';
import { AppException } from '../../common/errors/app.exception';
import { JobsSecretGuard, secretosIguales } from './jobs-secret.guard';

const SECRETO = 'un-secreto-largo-de-al-menos-32-caracteres!!';

function contexto(header?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ header: (n: string) => (n === 'x-jobs-secret' ? header : undefined) }),
    }),
  } as unknown as ExecutionContext;
}

const guard = (secreto?: string) =>
  new JobsSecretGuard({ get: () => secreto } as unknown as ConfigService);

describe('JobsSecretGuard', () => {
  it('compara secretos sin importar el largo', () => {
    expect(secretosIguales(SECRETO, SECRETO)).toBe(true);
    expect(secretosIguales('corto', SECRETO)).toBe(false);
    expect(secretosIguales(SECRETO + 'x', SECRETO)).toBe(false);
  });

  it('deja pasar con el secreto correcto', () => {
    expect(guard(SECRETO).canActivate(contexto(SECRETO))).toBe(true);
  });

  it('rechaza secreto incorrecto, ausente o sin JOBS_SECRET configurado', () => {
    expect(() => guard(SECRETO).canActivate(contexto('otro'))).toThrow(AppException);
    expect(() => guard(SECRETO).canActivate(contexto())).toThrow(AppException);
    expect(() => guard(undefined).canActivate(contexto(SECRETO))).toThrow(AppException);
    expect(() => guard(undefined).canActivate(contexto(''))).toThrow(AppException);
  });
});
