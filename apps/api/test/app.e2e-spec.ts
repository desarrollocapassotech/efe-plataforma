import { Test } from '@nestjs/testing';
import { type NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';

describe('API (e2e)', () => {
  let app: NestExpressApplication;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    configurarApp(app);
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health responde ok con la base conectada', async () => {
    const res = await request(server).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', version: expect.any(String), db: 'ok' });
  });

  it('una ruta inexistente devuelve el formato de error estándar', async () => {
    const res = await request(server).get('/api/v1/no-existe').expect(404);
    expect(res.body).toEqual({
      error: { code: 'NO_ENCONTRADO', message: expect.any(String) },
    });
  });

  it('aplica headers de seguridad (helmet) y no expone la tecnología', async () => {
    const res = await request(server).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CORS permite solo los orígenes configurados', async () => {
    const permitido = await request(server)
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(permitido.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const otro = await request(server)
      .options('/api/v1/health')
      .set('Origin', 'https://malicioso.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(otro.headers['access-control-allow-origin']).toBeUndefined();
  });
});
