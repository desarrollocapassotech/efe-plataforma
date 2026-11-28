import { Global, Module } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { crearCuentasFirebase, CuentasFirebase } from './cuentas-firebase';
import { SesionService } from './sesion.service';
import { crearVerificador, VerificadorToken } from './verificador-token';

@Global()
@Module({
  providers: [
    { provide: VerificadorToken, inject: [ConfigService], useFactory: crearVerificador },
    { provide: CuentasFirebase, inject: [ConfigService], useFactory: crearCuentasFirebase },
    SesionService,
  ],
  exports: [VerificadorToken, CuentasFirebase, SesionService],
})
export class AuthModule {}
