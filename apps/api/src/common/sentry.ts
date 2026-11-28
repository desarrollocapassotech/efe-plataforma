import * as Sentry from '@sentry/node';
import { limpiarProfundo, ocultarDatosSensibles } from '@efe/shared/privacidad';

/**
 * Sentry (errores de la API). Solo se activa con SENTRY_DSN. Sin datos personales:
 * no manda IP, cookies, headers de auth ni bodies; el usuario va solo por id; los
 * mensajes y breadcrumbs pasan por `ocultarDatosSensibles` (emails y montos).
 */
export function iniciarSentry(opciones: { dsn: string; entorno: string; version: string }) {
  Sentry.init({
    dsn: opciones.dsn,
    environment: opciones.entorno,
    release: `efe-api@${opciones.version}`,
    tracesSampleRate: 0,
    beforeSend(evento) {
      if (evento.request) {
        evento.request = {
          method: evento.request.method,
          url: evento.request.url ? ocultarDatosSensibles(evento.request.url) : undefined,
        };
      }
      if (evento.user) evento.user = evento.user.id ? { id: String(evento.user.id) } : undefined;
      if (evento.message) evento.message = ocultarDatosSensibles(evento.message);
      for (const ex of evento.exception?.values ?? []) {
        if (ex.value) ex.value = ocultarDatosSensibles(ex.value);
      }
      if (evento.extra) evento.extra = limpiarProfundo(evento.extra);
      return evento;
    },
    beforeBreadcrumb: (miga) => limpiarProfundo(miga),
  });
}

/** Reporta un error (no hace nada si Sentry no está iniciado). */
export function reportarError(error: unknown): void {
  Sentry.captureException(error);
}
