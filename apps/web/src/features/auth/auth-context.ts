import { createContext, useContext } from 'react';

/** Datos mínimos del usuario de Firebase que usa la app. */
export interface UsuarioAuth {
  uid: string;
  email: string | null;
  emailVerificado: boolean;
}

export interface AuthContextValue {
  usuario: UsuarioAuth | null;
  /** true hasta que Firebase resuelve si hay sesión. */
  cargando: boolean;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  registrar: (email: string, password: string) => Promise<void>;
  recuperarPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Error de un login con Google por redirect (móvil), que vuelve después de recargar. */
  errorRedirect: unknown;
}

// Sin imports de Firebase a propósito: las pantallas y los tests dependen solo de esto.
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const valor = useContext(AuthContext);
  if (!valor) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>');
  return valor;
}
