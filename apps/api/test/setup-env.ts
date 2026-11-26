import { leerEnvTest } from './env-test';

// Los e2e corren contra la base de tests (rama `test` de Neon o el Postgres de
// docker-compose), nunca contra la de desarrollo.
Object.assign(process.env, leerEnvTest());
