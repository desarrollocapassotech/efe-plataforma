import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from './common/auth/auth.module';
import { FirebaseAuthGuard } from './common/auth/firebase-auth.guard';
import { FeatureGuard, RolesGuard } from './common/auth/permisos.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DecimalInterceptor } from './common/money/decimal.interceptor';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { CategoriasModule } from './modules/categorias/categorias.module';
import { CuentasModule } from './modules/cuentas/cuentas.module';
import { HealthModule } from './modules/health/health.module';
import { MovimientosModule } from './modules/movimientos/movimientos.module';
import { TransferenciasModule } from './modules/transferencias/transferencias.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.esTest ? 'silent' : config.get('LOG_LEVEL'),
          transport: config.esDesarrollo
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'SYS:HH:MM:ss' },
              }
            : undefined,
          // Nunca loguear tokens ni cookies.
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-jobs-secret"]',
          ],
          autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
        },
      }),
    }),
    // 100 requests por minuto por IP (ARCHITECTURE §9). Límites más estrictos por endpoint en 7.1.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    HealthModule,
    UsuariosModule,
    CuentasModule,
    CategoriasModule,
    MovimientosModule,
    TransferenciasModule,
  ],
  providers: [
    // Orden: rate limit → autenticación → rol → feature del plan.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: FirebaseAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeatureGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: DecimalInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
