import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { leerEnvTest } from './env-test';

/**
 * Antes de los e2e: aplica las migraciones pendientes en la base de tests.
 * `migrate deploy` solo aplica lo que falta; no crea migraciones ni borra datos.
 */
export default function globalSetup(): void {
  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: { ...process.env, ...leerEnvTest() },
    stdio: 'inherit',
  });
}
