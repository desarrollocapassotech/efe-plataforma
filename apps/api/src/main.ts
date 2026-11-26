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
  validarEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  configurarApp(app);
  await app.listen(app.get(ConfigService).get('PORT'));
}

bootstrap().catch((error: unknown) => {
  // Antes de que exista el logger de Nest (ej. entorno inválido): mensaje claro y salir.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
