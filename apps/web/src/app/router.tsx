import { createBrowserRouter, Link } from 'react-router-dom';
import { PantallaError } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RecuperarPage } from '@/features/auth/pages/RecuperarPage';
import { RegistroPage } from '@/features/auth/pages/RegistroPage';
import { InicioPage } from '@/features/dashboard/pages/InicioPage';
import { OnboardingPage } from '@/features/onboarding/pages/OnboardingPage';
import { MasPage } from '@/features/perfil/pages/MasPage';
import { MovimientosPage, ObjetivosPage, TarjetasPage } from '@/features/secciones';
import { RequiereSesion, SoloPublico } from './guards';
import { AppLayout } from './layout/AppLayout';

function NoEncontrado() {
  return (
    <PantallaError
      titulo="No encontramos esta página"
      mensaje="Puede que el link esté mal o que la página ya no exista."
      acciones={
        <Button asChild>
          <Link to="/">Ir al inicio</Link>
        </Button>
      }
    />
  );
}

export const router = createBrowserRouter([
  {
    element: <SoloPublico />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/registro', element: <RegistroPage /> },
      { path: '/recuperar', element: <RecuperarPage /> },
    ],
  },
  {
    element: <RequiereSesion />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <InicioPage /> },
          { path: '/movimientos', element: <MovimientosPage /> },
          { path: '/tarjetas', element: <TarjetasPage /> },
          { path: '/objetivos', element: <ObjetivosPage /> },
          { path: '/mas', element: <MasPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NoEncontrado /> },
]);
