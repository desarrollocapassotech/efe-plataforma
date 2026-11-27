import { Module } from '@nestjs/common';
import { AdminIndicadoresController, IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';
import { ClienteHttp } from './proveedores/cliente-http';

@Module({
  controllers: [IndicadoresController, AdminIndicadoresController],
  providers: [IndicadoresService, ClienteHttp],
  exports: [IndicadoresService],
})
export class IndicadoresModule {}
