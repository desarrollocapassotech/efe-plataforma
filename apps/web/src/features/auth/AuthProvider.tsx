import { useQueryClient } from '@tanstack/react-query';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { AuthContext, type AuthContextValue, type UsuarioAuth } from './auth-context';

/** Móvil = pantalla táctil chica: ahí el popup de Google anda mal y se usa redirect. */
function esMovil(): boolean {
  return window.matchMedia('(pointer: coarse) and (max-width: 768px)').matches;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorRedirect, setErrorRedirect] = useState<unknown>(null);
  const uidAnterior = useRef<string | null>(null);

  useEffect(() => {
    // Resultado de un login con Google por redirect (solo importa si falló).
    getRedirectResult(auth).catch((error: unknown) => setErrorRedirect(error));

    return onAuthStateChanged(auth, (u) => {
      // Si cambia el usuario (logout o login de otro), no puede quedar nada en cache.
      if (uidAnterior.current !== (u?.uid ?? null)) queryClient.clear();
      uidAnterior.current = u?.uid ?? null;
      setUsuario(u ? { uid: u.uid, email: u.email, emailVerificado: u.emailVerified } : null);
      setCargando(false);
    });
  }, [queryClient]);

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      cargando,
      errorRedirect,
      async loginEmail(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async loginGoogle() {
        const proveedor = new GoogleAuthProvider();
        proveedor.setCustomParameters({ prompt: 'select_account' });
        if (esMovil()) await signInWithRedirect(auth, proveedor);
        else await signInWithPopup(auth, proveedor);
      },
      async registrar(email, password) {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        // La verificación la maneja Firebase; no bloquea el uso de la app.
        await sendEmailVerification(user).catch(() => undefined);
      },
      async recuperarPassword(email) {
        await sendPasswordResetEmail(auth, email);
      },
      async logout() {
        await signOut(auth);
        queryClient.clear();
      },
    }),
    [usuario, cargando, errorRedirect, queryClient],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
