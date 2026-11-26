import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga apps/api/<archivo> en process.env si existe (desarrollo y tests). En producción
 * (Render) no hay archivo y las variables vienen del entorno. Usa el loader nativo de
 * Node 22: sin dotenv. No pisa variables ya definidas en el entorno.
 */
export function cargarEnvFile(archivo = '.env'): void {
  // src/config o dist/config → apps/api
  const ruta = resolve(__dirname, '..', '..', archivo);
  if (existsSync(ruta)) process.loadEnvFile(ruta);
}
