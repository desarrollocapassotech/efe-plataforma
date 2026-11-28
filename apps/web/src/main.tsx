import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Providers } from './app/Providers';
import { router } from './app/router';
import './index.css';
import { env } from './lib/env';

// Sentry se carga aparte y solo si hay DSN: no pesa en la carga inicial.
if (env.VITE_SENTRY_DSN) {
  void import('./lib/sentry').then((m) => m.iniciarSentry(env.VITE_SENTRY_DSN, 'efe-web'));
}

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Falta #root en index.html');

createRoot(raiz).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
