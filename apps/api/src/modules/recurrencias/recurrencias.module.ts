import { Module } from '@nestjs/common';
import { CategoriasModule } from '../categorias/categorias.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { RecurrenciasController } from './recurrencias.controller';
import { RecurrenciasService } from './recurrencias.service';

@Module({
  imports: [CuentasModule, CategoriasModule],
  controllers: [RecurrenciasController],
  providers: [RecurrenciasService],
  exports: [RecurrenciasService],
})
export class RecurrenciasModule {}
