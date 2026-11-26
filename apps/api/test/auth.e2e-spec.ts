import { randomUUID } from 'node:crypto';
import { Controller, Get } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { RequiresFeature, Roles } from '../src/common/auth/decoradores';
import { configurarApp } from '../src/configurar-app';
import { PrismaService } from '../src/prisma/prisma.service';

// Endpoints que existen solo en este test, para probar los decoradores de permisos.
@Controller('prueba')
class PruebaController {
  @Get('admin')
  @Roles('ADMIN')
  admin() {
    return { ok: true };
  }

  @Get('premium')
  @RequiresFeature('analizador_on')
  premium() {
    return { ok: true };
  }
}

describe('Auth y /me (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;
  let prisma: PrismaService;

  // UIDs únicos por corrida: la base de tests es compartida.
  const corrida = randomUUID().slice(0, 8);
  const uidA = `e2e-a-${corrida}`;
  const uidB = `e2e-b-${corrida}`;
  const tokenA = `Bearer test:${uidA}:a-${corrida}@test.efe`;
  const tokenB = `Bearer test:${uidB}:b-${corrida}@test.efe`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [PruebaController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configurarApp(app);
    await app.init();
    server = app.getHttpServer() as App;
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { firebaseUid: { in: [uidA, uidB] } } });
    await app.close();
  });

  it('sin token → 401 NO_AUTENTICADO; token inválido → 401 TOKEN_INVALIDO', async () => {
    const sin = await request(server).get('/api/v1/me').expect(401);
    expect(sin.body.error.code).toBe('NO_AUTENTICADO');
    const malo = await request(server)
      .get('/api/v1/me')
      .set('Authorization', 'Bearer no-es-un-token')
      .expect(401);
    expect(malo.body.error.code).toBe('TOKEN_INVALIDO');
  });

  it('health sigue siendo público', async () => {
    await request(server).get('/api/v1/health').expect(200);
  });

  it('GET /me crea el usuario la primera vez, con plan FREE, features y 18 categorías', async () => {
    const res = await request(server).get('/api/v1/me').set('Authorization', tokenA).expect(200);
    expect(res.body).toMatchObject({
      email: `a-${corrida}@test.efe`,
      nombre: null,
      rol: 'USUARIO',
      plan: 'FREE',
      monedaPrincipal: 'ARS',
      onboardingCompletado: false,
    });
    expect(res.body.features).toContain('finanzas');
    expect(res.body.features).not.toContain('analizador_on');

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { firebaseUid: uidA },
      include: { _count: { select: { categorias: true } } },
    });
    expect(usuario._count.categorias).toBe(18);
    expect(usuario.ultimoAccesoEn).not.toBeNull();

    // La segunda vez no duplica nada.
    const otra = await request(server).get('/api/v1/me').set('Authorization', tokenA).expect(200);
    expect(otra.body.id).toBe(res.body.id);
    expect(await prisma.usuario.count({ where: { firebaseUid: uidA } })).toBe(1);
    expect(await prisma.categoria.count({ where: { usuarioId: res.body.id } })).toBe(18);
  });

  it('dos usuarios distintos ven cada uno sus datos', async () => {
    const a = await request(server).get('/api/v1/me').set('Authorization', tokenA).expect(200);
    const b = await request(server).get('/api/v1/me').set('Authorization', tokenB).expect(200);
    expect(a.body.id).not.toBe(b.body.id);
    expect(a.body.email).toBe(`a-${corrida}@test.efe`);
    expect(b.body.email).toBe(`b-${corrida}@test.efe`);

    // Lo que cambia A no le cambia a B.
    await request(server)
      .patch('/api/v1/me')
      .set('Authorization', tokenA)
      .send({ nombre: 'Usuario A' })
      .expect(200);
    const b2 = await request(server).get('/api/v1/me').set('Authorization', tokenB).expect(200);
    expect(b2.body.nombre).toBeNull();
  });

  it('PATCH /me actualiza nombre, moneda y onboarding', async () => {
    const res = await request(server)
      .patch('/api/v1/me')
      .set('Authorization', tokenA)
      .send({ nombre: '  Elías ', monedaPrincipal: 'USD', onboardingCompletado: true })
      .expect(200);
    expect(res.body).toMatchObject({
      nombre: 'Elías',
      monedaPrincipal: 'USD',
      onboardingCompletado: true,
    });
  });

  it('PATCH /me no deja cambiar rol ni plan, ni mandar body vacío', async () => {
    for (const body of [{ rol: 'ADMIN' }, { plan: 'PREMIUM' }, {}]) {
      const res = await request(server)
        .patch('/api/v1/me')
        .set('Authorization', tokenA)
        .send(body)
        .expect(400);
      expect(res.body.error.code).toBe('VALIDACION');
    }
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { firebaseUid: uidA } });
    expect(usuario.rol).toBe('USUARIO');
    expect(usuario.plan).toBe('FREE');
  });

  it('@Roles("ADMIN") da 403 a un USUARIO y deja pasar a un ADMIN', async () => {
    const res = await request(server)
      .get('/api/v1/prueba/admin')
      .set('Authorization', tokenB)
      .expect(403);
    expect(res.body.error.code).toBe('PROHIBIDO');

    await prisma.usuario.update({ where: { firebaseUid: uidB }, data: { rol: 'ADMIN' } });
    await request(server).get('/api/v1/prueba/admin').set('Authorization', tokenB).expect(200);
  });

  it('@RequiresFeature("analizador_on") da 403 a FREE y deja pasar a PREMIUM', async () => {
    const res = await request(server)
      .get('/api/v1/prueba/premium')
      .set('Authorization', tokenA)
      .expect(403);
    expect(res.body.error).toMatchObject({
      code: 'FEATURE_NO_INCLUIDA',
      details: { feature: 'analizador_on' },
    });

    await prisma.usuario.update({ where: { firebaseUid: uidA }, data: { plan: 'PREMIUM' } });
    await request(server).get('/api/v1/prueba/premium').set('Authorization', tokenA).expect(200);
  });

  it('usuario eliminado → 403 CUENTA_ELIMINADA', async () => {
    await prisma.usuario.update({
      where: { firebaseUid: uidB },
      data: { eliminadoEn: new Date() },
    });
    const res = await request(server).get('/api/v1/me').set('Authorization', tokenB).expect(403);
    expect(res.body.error.code).toBe('CUENTA_ELIMINADA');
  });
});
