import { createBrowserRouter, Link } from 'react-router-dom';
import { PantallaError } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RecuperarPage } from '@/features/auth/pages/RecuperarPage';
import { RegistroPage } from '@/features/auth/pages/RegistroPage';
import { CategoriasPage } from '@/features/categorias/pages/CategoriasPage';
import { CuentasPage } from '@/features/cuentas/pages/CuentasPage';
import { InicioPage } from '@/features/dashboard/pages/InicioPage';
import { IndicadoresPage } from '@/features/indicadores/pages/IndicadoresPage';
import { OnboardingPage } from '@/features/onboarding/pages/OnboardingPage';
import { MasPage } from '@/features/perfil/pages/MasPage';
import { MovimientosPage } from '@/features/movimientos/pages/MovimientosPage';
import { RecurrentesPage } from '@/features/recurrencias/pages/RecurrentesPage';
import { ObjetivoPage } from '@/features/objetivos/pages/ObjetivoPage';
import { ObjetivosPage } from '@/features/objetivos/pages/ObjetivosPage';
import { ComprometidoPage } from '@/features/tarjetas/pages/ComprometidoPage';
import { ResumenPage } from '@/features/tarjetas/pages/ResumenPage';
import { TarjetasPage } from '@/features/tarjetas/pages/TarjetasPage';
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
          { path: '/tarjetas/comprometido', element: <ComprometidoPage /> },
          { path: '/tarjetas/:id', element: <ResumenPage /> },
          { path: '/objetivos', element: <ObjetivosPage /> },
          { path: '/objetivos/:id', element: <ObjetivoPage /> },
          { path: '/mas', element: <MasPage /> },
          { path: '/mas/cuentas', element: <CuentasPage /> },
          { path: '/mas/categorias', element: <CategoriasPage /> },
          { path: '/mas/recurrentes', element: <RecurrentesPage /> },
        ],
      },
    ],
  },
  // Pública y privada a la vez: con sesión se ve dentro de la app (ver IndicadoresPage).
  { path: '/indicadores', element: <IndicadoresPage /> },
  { path: '*', element: <NoEncontrado /> },
]);
