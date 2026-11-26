import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { env } from './env';

// Proyecto efecapitaladmin (ARCHITECTURE §2 "Firebase"): solo Auth, sin Firestore.
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
// Emails de Firebase (verificación, reseteo) en español.
auth.languageCode = 'es';
