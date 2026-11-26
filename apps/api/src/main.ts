import { cargarEnvFile } from './config/cargar-env-file';
cargarEnvFile();

import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { configurarApp } from './configurar-app';
import { validarEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Antes de crear la app: si el entorno es inválido, solo el mensaje claro, sin stack de Nest.
  const env = validarEnv();
  // Con NODE_ENV=test la API acepta tokens falsos ("test:<uid>:<email>"). Eso es solo para
  // los e2e, que levantan la app con @nestjs/testing y nunca pasan por acá: un servidor
  // real (main.ts) se niega a arrancar en modo test.
  if (env.NODE_ENV === 'test') {
    throw new Error(
      'NODE_ENV=test es solo para tests automatizados: la API no arranca en ese modo.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  configurarApp(app);
  await app.listen(app.get(ConfigService).get('PORT'));
}

bootstrap().catch((error: unknown) => {
  // Antes de que exista el logger de Nest (ej. entorno inválido): mensaje claro y salir.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
