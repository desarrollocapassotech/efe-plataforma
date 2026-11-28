import { Module } from '@nestjs/common';
import { CatalogoController, ClientesController } from './asesoramiento.controller';
import { CatalogoService } from './catalogo.service';
import { ClientesService } from './clientes.service';

@Module({
  controllers: [ClientesController, CatalogoController],
  providers: [ClientesService, CatalogoService],
})
export class AsesoramientoModule {}
