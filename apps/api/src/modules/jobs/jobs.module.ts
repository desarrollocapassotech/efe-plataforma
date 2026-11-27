import { Module } from '@nestjs/common';
import { IndicadoresModule } from '../indicadores/indicadores.module';
import { RecurrenciasModule } from '../recurrencias/recurrencias.module';
import { JobsSecretGuard } from './jobs-secret.guard';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [RecurrenciasModule, IndicadoresModule],
  controllers: [JobsController],
  providers: [JobsService, JobsSecretGuard],
})
export class JobsModule {}
