import { Module } from '@nestjs/common';
import { CategoriasModule } from '../categorias/categorias.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { MovimientosController } from './movimientos.controller';
import { MovimientosService } from './movimientos.service';

@Module({
  imports: [CuentasModule, CategoriasModule],
  controllers: [MovimientosController],
  providers: [MovimientosService],
  exports: [MovimientosService],
})
export class MovimientosModule {}
