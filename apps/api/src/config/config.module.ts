import { Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service';
import { validarEnv } from './env';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      // Falla al construir el módulo (al arrancar) si el entorno es inválido.
      useFactory: () => new ConfigService(validarEnv()),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
