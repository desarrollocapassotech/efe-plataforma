import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { BotonReintentar, PantallaCarga, PantallaError } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { useMe } from '@/features/perfil/hooks';
import { esApiError } from '@/lib/api-error';

interface EstadoNavegacion {
  desde?: string;
}

/** Rutas públicas (login, registro, recuperar): si ya hay sesión, va a la app. */
export function SoloPublico() {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <PantallaCarga />;
  if (usuario) {
    const desde = (location.state as EstadoNavegacion | null)?.desde;
    return <Navigate to={desde ?? '/'} replace />;
  }
  return <Outlet />;
}

/**
 * Zona privada: exige sesión de Firebase y carga /me (que crea el usuario en la API la
 * primera vez). Si el onboarding no está completo, manda a /onboarding.
 */
export function RequiereSesion() {
  const { usuario, cargando, logout } = useAuth();
  const location = useLocation();
  const me = useMe();

  if (cargando) return <PantallaCarga />;
  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ desde: location.pathname } satisfies EstadoNavegacion}
      />
    );
  }
  if (me.isPending) return <PantallaCarga />;

  if (me.isError) {
    if (esApiError(me.error, 'CUENTA_ELIMINADA')) {
      // TODO(7.1): opción de restaurar la cuenta dentro de los 30 días.
      return (
        <PantallaError
          titulo="Tu cuenta está programada para eliminarse"
          mensaje="Si fue un error, escribinos para recuperarla antes de que se borre definitivamente."
          acciones={
            <Button variant="outline" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
          }
        />
      );
    }
    return (
      <PantallaError
        titulo="No pudimos cargar tu cuenta"
        mensaje={me.error.message}
        acciones={
          <>
            <Button variant="outline" onClick={() => void logout()}>
              Cerrar sesión
            </Button>
            <BotonReintentar onClick={() => void me.refetch()} />
          </>
        }
      />
    );
  }

  const enOnboarding = location.pathname === '/onboarding';
  if (!me.data.onboardingCompletado && !enOnboarding) return <Navigate to="/onboarding" replace />;
  if (me.data.onboardingCompletado && enOnboarding) return <Navigate to="/" replace />;
  return <Outlet />;
}
