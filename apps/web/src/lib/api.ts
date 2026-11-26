import { crearApiClient } from './api-client';
import { env } from './env';
import { auth } from './firebase';

/** Cliente de la API de EFE con el ID token del usuario logueado. */
export const api = crearApiClient(env.VITE_API_URL, async (forzarRefresco) => {
  const usuario = auth.currentUser;
  return usuario ? usuario.getIdToken(forzarRefresco) : null;
});
