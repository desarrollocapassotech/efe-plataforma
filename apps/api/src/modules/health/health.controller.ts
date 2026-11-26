import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { HealthService, type EstadoHealth } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  // TODO(1.5): marcar con @Public() cuando exista el guard global de auth.
  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Estado de la API y de la base de datos' })
  async check(@Res({ passthrough: true }) res: Response): Promise<EstadoHealth> {
    const estado = await this.health.estado();
    // 503 si la base no responde: Render lo usa como health check.
    if (estado.db !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return estado;
  }
}
