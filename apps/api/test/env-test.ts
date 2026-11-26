import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

/**
 * Lee apps/api/.env.test. Sus valores PISAN los del entorno: los e2e nunca deben
 * terminar contra la base de desarrollo por un DATABASE_URL exportado en la shell.
 */
export function leerEnvTest(): Record<string, string> {
  const ruta = resolve(__dirname, '..', '.env.test');
  if (!existsSync(ruta)) {
    throw new Error('Falta apps/api/.env.test (ver .env.example, sección "Tests e2e")');
  }
  const valores = parseEnv(readFileSync(ruta, 'utf8')) as Record<string, string>;
  return { ...valores, NODE_ENV: 'test' };
}
