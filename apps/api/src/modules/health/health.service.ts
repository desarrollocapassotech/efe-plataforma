import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EstadoHealth {
  status: 'ok' | 'error';
  version: string;
  db: 'ok' | 'error';
}

// src/modules/health y dist/modules/health están a la misma profundidad de apps/api.
const VERSION = (
  JSON.parse(readFileSync(resolve(__dirname, '..', '..', '..', 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async estado(): Promise<EstadoHealth> {
    const dbOk = await this.prisma.estaDisponible();
    return { status: dbOk ? 'ok' : 'error', version: VERSION, db: dbOk ? 'ok' : 'error' };
  }
}
