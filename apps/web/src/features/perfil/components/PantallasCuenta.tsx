import { TERMINOS_VERSION } from '@efe/shared/schemas';
import { Loader2, ShieldCheck, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { fechaCorta } from '@/lib/fechas-ui';
import { leerPreferencia, PREFERENCIA_TERMINOS } from '@/lib/preferencias';
import { useAceptarTerminos, useRestaurarCuenta } from '../hooks';

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm space-y-5 overflow-hidden rounded-lg border bg-card p-6">
        {children}
      </div>
    </main>
  );
}

/** La cuenta está dada de baja: se puede recuperar hasta la fecha de purga. */
export function PantallaCuentaEliminada({ purgaEn }: { purgaEn?: string }) {
  const { logout } = useAuth();
  const restaurar = useRestaurarCuenta();
  const fecha = purgaEn ? fechaCorta(purgaEn.slice(0, 10)) : null;
  return (
    <Marco>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Tu cuenta está programada para eliminarse</h1>
        <p className="text-sm text-muted-foreground">
          {fecha
            ? `Si no hacés nada, el ${fecha} se borran tus datos para siempre.`
            : 'Si no hacés nada, en unos días se borran tus datos para siempre.'}{' '}
          Hasta entonces la podés recuperar tal como estaba.
        </p>
      </div>
      {restaurar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {restaurar.error.message}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button onClick={() => restaurar.mutate()} disabled={restaurar.isPending}>
          {restaurar.isPending ? <Loader2 className="animate-spin" /> : <Undo2 />}
          Recuperar mi cuenta
        </Button>
        <Button variant="outline" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </div>
    </Marco>
  );
}

/**
 * Antes de entrar: aceptar la versión vigente de términos y privacidad. Si la aceptó al
 * registrarse (checkbox), se registra sola sin volver a preguntar.
 */
export function PantallaTerminos() {
  const { logout } = useAuth();
  const aceptar = useAceptarTerminos();
  const [acepto, setAcepto] = useState(false);
  const yaAcepto = leerPreferencia(PREFERENCIA_TERMINOS) === TERMINOS_VERSION;
  const enviado = useRef(false);

  useEffect(() => {
    if (yaAcepto && !enviado.current) {
      enviado.current = true;
      aceptar.mutate();
    }
  }, [yaAcepto, aceptar]);

  if (yaAcepto && !aceptar.isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Marco>
      <div className="space-y-2">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <h1 className="text-lg font-semibold">Antes de seguir</h1>
        <p className="text-sm text-muted-foreground">
          Para usar EFE Capital tenés que aceptar los{' '}
          <Link
            to="/terminos"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            términos y condiciones
          </Link>{' '}
          y la{' '}
          <Link
            to="/privacidad"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            política de privacidad
          </Link>
          .
        </p>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={acepto}
          onChange={(e) => setAcepto(e.target.checked)}
          className="mt-0.5 h-5 w-5 accent-primary"
        />
        Leí y acepto los términos y la política de privacidad.
      </label>
      {aceptar.isError && (
        <p role="alert" className="text-sm text-destructive">
          {aceptar.error.message}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button onClick={() => aceptar.mutate()} disabled={!acepto || aceptar.isPending}>
          {aceptar.isPending && <Loader2 className="animate-spin" />}
          Continuar
        </Button>
        <Button variant="ghost" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </div>
    </Marco>
  );
}
