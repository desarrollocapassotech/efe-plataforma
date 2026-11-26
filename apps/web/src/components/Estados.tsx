import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/** Estados dentro de una sección (no de pantalla completa): cargando, error y vacío. */

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
      role="status"
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      {texto}
    </div>
  );
}

export function ErrorCarga({
  mensaje,
  onReintentar,
}: {
  mensaje?: string;
  onReintentar: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border px-6 py-10 text-center">
      <AlertTriangle className="h-7 w-7 text-warning" />
      <p className="text-sm text-muted-foreground">
        {mensaje ?? 'No pudimos cargar esta información.'}
      </p>
      <Button variant="outline" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}

interface VacioProps {
  icono: LucideIcon;
  titulo: string;
  texto?: string;
  accion?: ReactNode;
}

export function Vacio({ icono: Icono, titulo, texto, accion }: VacioProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center">
      <Icono className="h-8 w-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        {texto && <p className="text-sm text-muted-foreground">{texto}</p>}
      </div>
      {accion}
    </div>
  );
}
