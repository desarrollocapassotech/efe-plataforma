import { z } from 'zod';

const EnvSchema = z.object({
  VITE_API_URL: z.url(),
  VITE_FIREBASE_API_KEY: z.string().min(1),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  VITE_FIREBASE_PROJECT_ID: z.string().min(1),
  VITE_FIREBASE_APP_ID: z.string().min(1),
  VITE_SENTRY_DSN: z.string().optional(),
});

const resultado = EnvSchema.safeParse(import.meta.env);
if (!resultado.success) {
  const faltan = resultado.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Configuración inválida de la web. Revisá apps/web/.env.local: ${faltan}`);
}

/** Variables de entorno validadas al cargar la app. */
export const env = resultado.data;
