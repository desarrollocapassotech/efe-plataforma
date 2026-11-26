import { randomUUID } from 'node:crypto';
import { type Type } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/configurar-app';
import { PrismaService } from '../src/prisma/prisma.service';

export interface AppDePrueba {
  app: NestExpressApplication;
  server: App;
  prisma: PrismaService;
}

/** Levanta la app con la misma configuración HTTP que producción (configurarApp). */
export async function crearAppDePrueba(controllers: Type[] = []): Promise<AppDePrueba> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configurarApp(app);
  await app.init();
  return { app, server: app.getHttpServer() as App, prisma: app.get(PrismaService) };
}

export interface UsuarioDePrueba {
  id: string;
  firebaseUid: string;
  email: string;
  /** Header Authorization con token de prueba. */
  auth: string;
}

/**
 * Crea un usuario nuevo (con sus categorías default) llamando a GET /me.
 * UID único por corrida: la base de tests es compartida.
 */
export async function crearUsuario(server: App, prefijo: string): Promise<UsuarioDePrueba> {
  const firebaseUid = `e2e-${prefijo}-${randomUUID().slice(0, 8)}`;
  const email = `${firebaseUid}@test.efe`;
  const auth = `Bearer test:${firebaseUid}:${email}`;
  const res = await request(server).get('/api/v1/me').set('Authorization', auth).expect(200);
  return { id: (res.body as { id: string }).id, firebaseUid, email, auth };
}

/** Borra los usuarios de prueba (en cascada se va todo lo suyo). */
export async function borrarUsuarios(prisma: PrismaService, usuarios: UsuarioDePrueba[]) {
  await prisma.usuario.deleteMany({ where: { id: { in: usuarios.map((u) => u.id) } } });
}

/** Fecha de negocio para columnas @db.Date. */
export const fecha = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T00:00:00Z`);
