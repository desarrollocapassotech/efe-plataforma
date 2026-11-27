import { LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { Logo } from '@/components/Logo';
import { PantallaCarga, Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/app/layout/AppLayout';
import { useAuth } from '@/features/auth/auth-context';
import { TarjetaDolar, TarjetaInflacion } from '../components/Tarjetas';
import { useIndicadores } from '../hooks';

function Contenido() {
  const indicadores = useIndicadores();
  if (indicadores.isPending) return <Cargando />;
  if (indicadores.isError) {
    return (
      <ErrorCarga
        mensaje={indicadores.error.message}
        onReintentar={() => void indicadores.refetch()}
      />
    );
  }
  if (indicadores.data.valores.length === 0) {
    return <Vacio icono={LineChart} titulo="Todavía no hay datos" texto="Volvé en un rato." />;
  }
  const d = indicadores.data;
  return (
    <div className="space-y-4">
      <TarjetaDolar tipo="MEP" datos={d} />
      <TarjetaDolar tipo="OFICIAL" datos={d} />
      <TarjetaDolar tipo="CCL" datos={d} />
      <TarjetaInflacion datos={d} />
      <p className="text-xs text-muted-foreground">
        Información de fuentes públicas, solo de referencia: no es una recomendación de inversión.
      </p>
    </div>
  );
}

/**
 * Indicadores (/indicadores): dentro de la app si hay sesión; si no, como página pública
 * con una invitación a registrarse (los datos son públicos).
 */
export function IndicadoresPage() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <PantallaCarga />;

  if (usuario) {
    return (
      <AppLayout>
        <Pagina titulo="Dólar e inflación" volverA="/mas">
          <Contenido />
        </Pagina>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="bg-sidebar pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Logo fondo="oscuro" />
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Link to="/login">Ingresar</Link>
          </Button>
        </div>
        <div className="brand-bar h-0.5" aria-hidden />
      </header>
      <Pagina titulo="Dólar e inflación">
        <Contenido />
        <section className="space-y-3 rounded-xl bg-primary px-5 py-5 text-primary-foreground">
          <p className="font-semibold">Ordená tus finanzas con EFE Capital</p>
          <p className="text-sm opacity-90">
            Cargá tus gastos, seguí tus tarjetas y ahorrá para tus objetivos. Es gratis.
          </p>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/registro">Crear mi cuenta</Link>
          </Button>
        </section>
      </Pagina>
    </div>
  );
}
