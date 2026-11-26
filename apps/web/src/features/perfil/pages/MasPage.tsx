import { LogOut } from 'lucide-react';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { useMe } from '../hooks';

const NOMBRE_PLAN = { FREE: 'Gratis', PREMIUM: 'Premium', ASESORAMIENTO: 'Asesoramiento' } as const;

// "Más": cuenta y accesos secundarios. Cuentas, categorías, recurrentes y perfil se suman
// en la fase 2 y en el paso 7.1.
export function MasPage() {
  const { logout } = useAuth();
  const { data: me } = useMe();

  return (
    <Pagina titulo="Más">
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
