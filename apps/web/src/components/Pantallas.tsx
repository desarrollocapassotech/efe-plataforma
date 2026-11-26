import { AlertTriangle, ArrowLeft, Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Pantalla completa de carga (mientras se resuelve la sesión o /me). */
export function PantallaCarga() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

interface PantallaErrorProps {
  titulo: string;
  mensaje: string;
  acciones?: ReactNode;
}

export function PantallaError({ titulo, mensaje, acciones }: PantallaErrorProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertTriangle className="h-8 w-8 text-warning" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">{titulo}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{mensaje}</p>
      </div>
      {acciones && <div className="flex gap-2">{acciones}</div>}
    </div>
  );
}

interface PaginaProps {
  titulo: string;
  /** Ruta a la que vuelve la flecha (subpáginas, ej. "Más" → "Cuentas"). */
  volverA?: string;
  /** Acción secundaria a la derecha del título. */
  accion?: ReactNode;
  children?: ReactNode;
}

/** Encabezado + contenido de una página privada. */
export function Pagina({ titulo, volverA, accion, children }: PaginaProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex items-center gap-2">
        {volverA && (
          <Link
            to={volverA}
            className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <h1 className="flex-1 text-2xl font-semibold">{titulo}</h1>
        {accion}
      </div>
      {children}
    </div>
  );
}

interface EnConstruccionProps {
  icono: LucideIcon;
  texto: string;
}

/** Contenido provisorio de las secciones que llegan en pasos siguientes del plan. */
export function EnConstruccion({ icono: Icono, texto }: EnConstruccionProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <Icono className="h-8 w-8 text-muted-foreground" />
      <p className="max-w-xs text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

export function BotonReintentar({ onClick }: { onClick: () => void }) {
  return <Button onClick={onClick}>Reintentar</Button>;
}
