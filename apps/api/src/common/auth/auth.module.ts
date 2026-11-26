import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { SesionService } from './sesion.service';
import { crearVerificador, VerificadorToken } from './verificador-token';

@Global()
@Module({
  providers: [
    { provide: VerificadorToken, inject: [ConfigService], useFactory: crearVerificador },
    SesionService,
  ],
  exports: [VerificadorToken, SesionService],
})
export class AuthModule {}
