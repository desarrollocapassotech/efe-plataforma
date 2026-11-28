import * as Sentry from '@sentry/react';
import { limpiarProfundo, ocultarDatosSensibles } from '@efe/shared/privacidad';

/**
 * Sentry en el navegador. Solo con VITE_SENTRY_DSN. Sin datos personales: el usuario va
 * solo por id (nunca email) y mensajes, URLs y breadcrumbs pasan por
 * `ocultarDatosSensibles` (emails y montos). Sin tracing ni replays.
 */
export function iniciarSentry(dsn: string | undefined, app: 'efe-web' | 'efe-admin') {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: app,
    beforeSend(evento) {
      if (evento.request?.url) evento.request = { url: ocultarDatosSensibles(evento.request.url) };
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
