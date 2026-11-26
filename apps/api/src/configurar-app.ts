import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { ConfigService } from './config/config.service';

export const PREFIJO_API = 'api/v1';

/**
 * Configuración HTTP de la app. La usan main.ts y los tests e2e, para que los e2e
 * prueben exactamente lo mismo que corre en producción.
 */
export function configurarApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix(PREFIJO_API);
  // Render (y cualquier proxy) manda la IP real en X-Forwarded-For: la usa el throttler.
  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({
    origin: config.get('CORS_ORIGINS'),
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.enableShutdownHooks();

  if (!config.esProduccion) {
    const documento = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('EFE Capital API').setVersion('v1').addBearerAuth().build(),
    );
    SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(documento));
  }
}
