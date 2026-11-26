import { Module } from '@nestjs/common';
import { CuentasModule } from '../cuentas/cuentas.module';
import { TransferenciasController } from './transferencias.controller';
import { TransferenciasService } from './transferencias.service';

@Module({
  imports: [CuentasModule],
  controllers: [TransferenciasController],
  providers: [TransferenciasService],
})
export class TransferenciasModule {}
