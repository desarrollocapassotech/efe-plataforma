import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const dsnSentry = import.meta.env.VITE_SENTRY_DSN as string | undefined;
// Sentry se carga aparte y solo si hay DSN.
if (dsnSentry) void import('./lib/sentry').then((m) => m.iniciarSentry(dsnSentry, 'efe-admin'));

createRoot(document.getElementById('root')!).render(<App />);
