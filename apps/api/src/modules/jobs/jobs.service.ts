import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception';
import { RecurrenciasService } from '../recurrencias/recurrencias.service';

export interface ResultadoJob {
  job: string;
  duracionMs: number;
  [dato: string]: unknown;
}

/**
 * Jobs disparados por cron externo (GitHub Actions, ARCHITECTURE §8).
 * `indicadores` (5.1) y `purgar-cuentas` (7.1) se agregan en sus pasos.
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  private readonly jobs: Record<string, () => Promise<Record<string, unknown>>> = {
    recurrencias: async () => ({ ...(await this.recurrencias.materializarTodas()) }),
  };

  constructor(private readonly recurrencias: RecurrenciasService) {}

  async ejecutar(job: string): Promise<ResultadoJob> {
    const correr = this.jobs[job];
    if (!correr) {
      throw new AppException('JOB_DESCONOCIDO', `No existe el job "${job}"`, HttpStatus.NOT_FOUND);
    }
    const inicio = Date.now();
    this.logger.log(`Job "${job}": inicio`);
    try {
      const resultado = await correr();
      const duracionMs = Date.now() - inicio;
      this.logger.log({ job, duracionMs, ...resultado }, `Job "${job}": fin`);
      return { job, duracionMs, ...resultado };
    } catch (error) {
      this.logger.error(
        `Job "${job}" falló después de ${Date.now() - inicio} ms: ${error instanceof Error ? error.stack : String(error)}`,
      );
      throw error;
    }
  }
}
