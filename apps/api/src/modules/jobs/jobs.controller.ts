import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/auth/decoradores';
import { HEADER_JOBS_SECRET, JobsSecretGuard } from './jobs-secret.guard';
import { type ResultadoJob, JobsService } from './jobs.service';

/** Sin token de Firebase: lo llama el cron con el header X-Jobs-Secret. */
@ApiTags('jobs')
@Public()
@SkipThrottle()
@UseGuards(JobsSecretGuard)
@Controller('internal/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post(':job')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: HEADER_JOBS_SECRET, required: true })
  @ApiOkResponse({ description: 'Resultado del job (cantidad generada, duración)' })
  ejecutar(@Param('job') job: string): Promise<ResultadoJob> {
    return this.jobs.ejecutar(job);
  }
}
