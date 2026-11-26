import { Module } from '@nestjs/common';
import { RecurrenciasModule } from '../recurrencias/recurrencias.module';
import { JobsSecretGuard } from './jobs-secret.guard';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [RecurrenciasModule],
  controllers: [JobsController],
  providers: [JobsService, JobsSecretGuard],
})
export class JobsModule {}
