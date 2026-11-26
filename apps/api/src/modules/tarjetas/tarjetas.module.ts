import { Module } from '@nestjs/common';
import { CategoriasModule } from '../categorias/categorias.module';
import { CuentasModule } from '../cuentas/cuentas.module';
import { ComprasService } from './compras.service';
import { PagosService } from './pagos.service';
import { ComprasController, PagosController, TarjetasController } from './tarjetas.controller';
import { TarjetasService } from './tarjetas.service';

@Module({
  imports: [CuentasModule, CategoriasModule],
  // Compras y pagos primero: sus rutas fijas no deben chocar con /tarjetas/:id.
  controllers: [ComprasController, PagosController, TarjetasController],
  providers: [TarjetasService, ComprasService, PagosService],
})
export class TarjetasModule {}
