import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma, type Usuario } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../errors/app.exception';
import { FEATURE_REQUERIDA, ES_PUBLICO, ROLES_REQUERIDOS } from './decoradores';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FeatureGuard, RolesGuard } from './permisos.guard';
import { SesionService } from './sesion.service';
import type { RequestConUsuario } from './usuario-actual';
import { VerificadorDePrueba } from './verificador-token';

const AHORA = new Date('2026-11-26T15:00:00Z');

function usuario(parcial: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u1',
    firebaseUid: 'uid1',
    email: 'a@b.com',
    nombre: null,
    rol: 'USUARIO',
    plan: 'FREE',
    monedaPrincipal: 'ARS',
    onboardingCompletado: false,
    ultimoAccesoEn: AHORA,
    creadoEn: AHORA,
    actualizadoEn: AHORA,
    eliminadoEn: null,
    ...parcial,
  };
}

function prismaFalso() {
  const tx = {
    usuario: { create: jest.fn() },
    categoria: { createMany: jest.fn() },
  };
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  // El guard usa la hora real: según cuándo corra el test puede actualizar ultimoAccesoEn.
  // Que el update siempre devuelva un usuario hace al test independiente de la hora.
  prisma.usuario.update.mockResolvedValue(usuario());
  return { prisma, tx };
}

function contexto(headers: Record<string, string>, metadatos: Record<string, unknown> = {}) {
  const req = { headers } as unknown as RequestConUsuario;
  const handler = () => undefined;
  const ctx = {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: (clave: string) => metadatos[clave],
  } as unknown as Reflector;
  return { ctx, req, reflector };
}

async function esperarError(promesa: Promise<unknown>, code: string, status: number) {
  const error = await promesa.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AppException);
  expect((error as AppException).code).toBe(code);
  expect((error as AppException).getStatus()).toBe(status);
}

describe('FirebaseAuthGuard', () => {
  const crearGuard = (reflector: Reflector, prisma: unknown) =>
    new FirebaseAuthGuard(
      reflector,
      new VerificadorDePrueba(),
      new SesionService(prisma as PrismaService),
    );

  it('endpoint @Public() pasa sin token', async () => {
    const { prisma } = prismaFalso();
    const { ctx, reflector } = contexto({}, { [ES_PUBLICO]: true });
    await expect(crearGuard(reflector, prisma).canActivate(ctx)).resolves.toBe(true);
  });

  it('sin token → 401 NO_AUTENTICADO', async () => {
    const { prisma } = prismaFalso();
    const { ctx, reflector } = contexto({});
    await esperarError(crearGuard(reflector, prisma).canActivate(ctx), 'NO_AUTENTICADO', 401);
  });

  it('token inválido → 401 TOKEN_INVALIDO', async () => {
    const { prisma } = prismaFalso();
    const { ctx, reflector } = contexto({ authorization: 'Bearer cualquiera' });
    await esperarError(crearGuard(reflector, prisma).canActivate(ctx), 'TOKEN_INVALIDO', 401);
  });

  it('usuario nuevo → se crea con las 18 categorías default en una transacción', async () => {
    const { prisma, tx } = prismaFalso();
    prisma.usuario.findUnique.mockResolvedValue(null);
    tx.usuario.create.mockResolvedValue(usuario({ ultimoAccesoEn: null }));
    prisma.usuario.update.mockResolvedValue(usuario());
    const { ctx, req, reflector } = contexto({ authorization: 'Bearer test:uid1:a@b.com' });

    await expect(crearGuard(reflector, prisma).canActivate(ctx)).resolves.toBe(true);

    expect(tx.usuario.create).toHaveBeenCalledWith({
      data: { firebaseUid: 'uid1', email: 'a@b.com' },
    });
    const { data } = tx.categoria.createMany.mock.calls[0][0] as { data: unknown[] };
    expect(data).toHaveLength(18);
    expect(data[0]).toMatchObject({ usuarioId: 'u1', esDefault: true });
    expect(req.user).toEqual({
      id: 'u1',
      firebaseUid: 'uid1',
      email: 'a@b.com',
      rol: 'USUARIO',
      plan: 'FREE',
    });
  });

  it('si dos requests crean el mismo usuario a la vez, el segundo lo lee', async () => {
    const { prisma, tx } = prismaFalso();
    prisma.usuario.findUnique.mockResolvedValue(null);
    tx.usuario.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't' }),
    );
    prisma.usuario.findUniqueOrThrow.mockResolvedValue(usuario());
    const { ctx, req, reflector } = contexto({ authorization: 'Bearer test:uid1:a@b.com' });

    await crearGuard(reflector, prisma).canActivate(ctx);
    expect(req.user?.id).toBe('u1');
  });

  it('usuario eliminado → 403 CUENTA_ELIMINADA', async () => {
    const { prisma } = prismaFalso();
    prisma.usuario.findUnique.mockResolvedValue(usuario({ eliminadoEn: AHORA }));
    const { ctx, reflector } = contexto({ authorization: 'Bearer test:uid1:a@b.com' });
    await esperarError(crearGuard(reflector, prisma).canActivate(ctx), 'CUENTA_ELIMINADA', 403);
  });

  it('usuario nuevo sin email en el token → 401 TOKEN_SIN_EMAIL', async () => {
    const { prisma } = prismaFalso();
    prisma.usuario.findUnique.mockResolvedValue(null);
    const { ctx, reflector } = contexto({ authorization: 'Bearer test:uid1:' });
    await esperarError(crearGuard(reflector, prisma).canActivate(ctx), 'TOKEN_SIN_EMAIL', 401);
  });
});

describe('SesionService: último acceso', () => {
  it('actualiza ultimoAccesoEn como máximo una vez por hora', async () => {
    const { prisma } = prismaFalso();
    const sesion = new SesionService(prisma as unknown as PrismaService);
    const identidad = { firebaseUid: 'uid1', email: 'a@b.com' };

    prisma.usuario.findUnique.mockResolvedValue(
      usuario({ ultimoAccesoEn: new Date(AHORA.getTime() - 59 * 60 * 1000) }),
    );
    await sesion.resolver(identidad, AHORA);
    expect(prisma.usuario.update).not.toHaveBeenCalled();

    prisma.usuario.findUnique.mockResolvedValue(
      usuario({ ultimoAccesoEn: new Date(AHORA.getTime() - 61 * 60 * 1000) }),
    );
    prisma.usuario.update.mockResolvedValue(usuario());
    await sesion.resolver(identidad, AHORA);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { ultimoAccesoEn: AHORA },
    });
  });

  it('sincroniza el email si cambió en Firebase', async () => {
    const { prisma } = prismaFalso();
    const sesion = new SesionService(prisma as unknown as PrismaService);
    prisma.usuario.findUnique.mockResolvedValue(usuario());
    prisma.usuario.update.mockResolvedValue(usuario({ email: 'nuevo@b.com' }));
    const actual = await sesion.resolver({ firebaseUid: 'uid1', email: 'nuevo@b.com' }, AHORA);
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { email: 'nuevo@b.com' },
    });
    expect(actual.email).toBe('nuevo@b.com');
  });
});

describe('RolesGuard y FeatureGuard', () => {
  const conUsuario = (metadatos: Record<string, unknown>, rol: string, plan: string) => {
    const { ctx, req, reflector } = contexto({}, metadatos);
    req.user = { id: 'u1', firebaseUid: 'x', email: 'a@b.com', rol, plan } as never;
    return { ctx, reflector };
  };

  it('@Roles("ADMIN"): USUARIO → 403 PROHIBIDO, ADMIN pasa', () => {
    const meta = { [ROLES_REQUERIDOS]: ['ADMIN'] };
    const u = conUsuario(meta, 'USUARIO', 'FREE');
    expect(() => new RolesGuard(u.reflector).canActivate(u.ctx)).toThrow(AppException);
    const a = conUsuario(meta, 'ADMIN', 'FREE');
    expect(new RolesGuard(a.reflector).canActivate(a.ctx)).toBe(true);
  });

  it('@RequiresFeature("analizador_on"): FREE → 403 FEATURE_NO_INCLUIDA, PREMIUM pasa', () => {
    const meta = { [FEATURE_REQUERIDA]: 'analizador_on' };
    const f = conUsuario(meta, 'USUARIO', 'FREE');
    let error: unknown;
    try {
      new FeatureGuard(f.reflector).canActivate(f.ctx);
    } catch (e) {
      error = e;
    }
    expect((error as AppException).code).toBe('FEATURE_NO_INCLUIDA');
    expect((error as AppException).getStatus()).toBe(403);
    const p = conUsuario(meta, 'USUARIO', 'PREMIUM');
    expect(new FeatureGuard(p.reflector).canActivate(p.ctx)).toBe(true);
  });

  it('sin metadatos no restringen', () => {
    const u = conUsuario({}, 'USUARIO', 'FREE');
    expect(new RolesGuard(u.reflector).canActivate(u.ctx)).toBe(true);
    expect(new FeatureGuard(u.reflector).canActivate(u.ctx)).toBe(true);
  });
});
