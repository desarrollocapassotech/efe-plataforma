import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Los e2e corren contra la base de tests (rama `test` de Neon o el Postgres de
// docker-compose), nunca contra la de desarrollo: se carga .env.test y no .env.
process.env.NODE_ENV = 'test';
const ruta = resolve(__dirname, '..', '.env.test');
if (!existsSync(ruta)) {
  throw new Error('Falta apps/api/.env.test (ver .env.example, sección "Tests e2e")');
}
process.loadEnvFile(ruta);
