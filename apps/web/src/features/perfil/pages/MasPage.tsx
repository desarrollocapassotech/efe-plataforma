import {
  ChevronRight,
  LineChart,
  LogOut,
  Repeat,
  Tags,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { useMe } from '../hooks';

const NOMBRE_PLAN = { FREE: 'Gratis', PREMIUM: 'Premium', ASESORAMIENTO: 'Asesoramiento' } as const;

const OPCIONES: { ruta: string; titulo: string; detalle: string; icono: LucideIcon }[] = [
  {
    ruta: '/mas/cuentas',
    titulo: 'Cuentas',
    detalle: 'Efectivo, banco, billeteras',
    icono: Wallet,
  },
  {
    ruta: '/mas/categorias',
    titulo: 'Categorías',
    detalle: 'En qué gastás y de dónde entra',
    icono: Tags,
  },
  {
    ruta: '/mas/recurrentes',
    titulo: 'Recurrentes',
    detalle: 'Lo que se carga solo cada mes',
    icono: Repeat,
  },
  {
    ruta: '/indicadores',
    titulo: 'Dólar e inflación',
    detalle: 'Cotizaciones del día e inflación del INDEC',
    icono: LineChart,
  },
];

// "Más": lo que no se usa todos los días. El perfil (7.1) se suma acá.
export function MasPage() {
  const { logout } = useAuth();
  const { data: me } = useMe();

  return (
    <Pagina titulo="Más">
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {OPCIONES.map(({ ruta, titulo, detalle, icono: Icono }) => (
          <li key={ruta}>
            <Link
              to={ruta}
              className="flex items-center gap-4 px-4 py-4 transition hover:bg-accent"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icono className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block font-medium">{titulo}</span>
                <span className="block text-sm text-muted-foreground">{detalle}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="eyebrow">Tu cuenta</p>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{me?.nombre ?? me?.email}</p>
              {me?.nombre && <p className="truncate text-sm text-muted-foreground">{me.email}</p>}
            </div>
            {me && (
              <span className="shrink-0 rounded-md bg-gold/10 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-foreground">
                {NOMBRE_PLAN[me.plan]}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <Button variant="outline" className="w-full" onClick={() => void logout()}>
        <LogOut />
        Cerrar sesión
      </Button>
    </Pagina>
  );
}
