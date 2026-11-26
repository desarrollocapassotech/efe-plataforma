import { z } from 'zod';

const listaSeparadaPorComas = z.string().transform((v) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * Variables de entorno de la API (docs/ARCHITECTURE.md §10).
 * - Firebase: obligatoria salvo en tests (los e2e usan tokens de prueba, sin Firebase).
 * - JOBS_SECRET: opcional hasta el paso 2.3, pero obligatoria en producción desde ya.
 */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DIRECT_URL: z.url({ protocol: /^postgres(ql)?$/ }),

    FIREBASE_PROJECT_ID: z.string().min(1).optional(),
    FIREBASE_CLIENT_EMAIL: z.email().optional(),
    FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),

    CORS_ORIGINS: listaSeparadaPorComas.default(['http://localhost:5173', 'http://localhost:5174']),
    JOBS_SECRET: z
      .string()
      .min(32, 'JOBS_SECRET tiene que tener al menos 32 caracteres')
      .optional(),
    SENTRY_DSN: z.url().optional(),
  })
  .superRefine((env, ctx) => {
    const exigir = (clave: keyof typeof env, mensaje: string) => {
      if (!env[clave]) ctx.addIssue({ code: 'custom', path: [clave], message: mensaje });
    };
    if (env.NODE_ENV !== 'test') {
      for (const clave of [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
      ] as const) {
        exigir(clave, 'falta definirla (service account de Firebase)');
      }
    }
    if (env.NODE_ENV === 'production') exigir('JOBS_SECRET', 'Obligatoria en producción');
  });

export type Env = z.infer<typeof EnvSchema>;

/** Las variables vacías ("FOO=") cuentan como no definidas. */
function sinVacias(raw: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(raw).filter((e): e is [string, string] => e[1] !== undefined && e[1] !== ''),
  );
}

/**
 * Valida el entorno. Si falta algo o es inválido, tira un Error con la lista completa
 * (sin mostrar los valores, que pueden ser secretos).
 */
export function validarEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const resultado = EnvSchema.safeParse(sinVacias(raw));
  if (resultado.success) return resultado.data;

  const problemas = resultado.error.issues.map((issue) => {
    const clave = issue.path.join('.') || '(entorno)';
    const falta = issue.code === 'invalid_type' && issue.input === undefined;
    return `  - ${clave}: ${falta ? 'falta definirla' : issue.message}`;
  });
  throw new Error(
    `Configuración inválida. Revisá apps/api/.env (ver .env.example):\n${problemas.join('\n')}`,
  );
}
