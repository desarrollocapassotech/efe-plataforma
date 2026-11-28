import type { ReactNode } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type FiltroAplicado = { key: string; label: string; value: string };

/** Filtros aplicados como badges removibles (patrón de listados del admin). */
export const FiltrosAplicados = ({
  filtros,
  onQuitar,
  onLimpiar,
}: {
  filtros: FiltroAplicado[];
  onQuitar: (key: string) => void;
  onLimpiar: () => void;
}) =>
  filtros.length === 0 ? null : (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
      {filtros.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 border border-primary/20 bg-primary/5 py-1 pl-2.5 pr-1 text-xs text-foreground"
        >
          <span className="text-muted-foreground">{f.label}:</span>
          <span className="font-medium">{f.value}</span>
          <button
            type="button"
            onClick={() => onQuitar(f.key)}
            className="inline-flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            aria-label={`Quitar filtro ${f.label}`}
            title="Quitar filtro"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      {filtros.length > 1 && (
        <button
          type="button"
          onClick={onLimpiar}
          className="px-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );

/** Carga / error / vacío dentro de la tarjeta del listado. */
export const EstadoListado = ({
  cargando,
  error,
  vacio,
  textoVacio,
  onReintentar,
  children,
}: {
  cargando: boolean;
  error: Error | null;
  vacio: boolean;
  textoVacio: string;
  onReintentar: () => void;
  children: ReactNode;
}) => {
  if (cargando) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        Cargando…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-sm">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <p className="text-muted-foreground">{error.message}</p>
        <Button variant="outline" size="sm" onClick={onReintentar}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (vacio) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
        <Inbox className="h-5 w-5" />
        {textoVacio}
      </div>
    );
  }
  return <>{children}</>;
};

/** Paginación del servidor: "1–25 de 120" + anterior/siguiente. */
export const Paginacion = ({
  pagina,
  limite,
  total,
  onCambiar,
}: {
  pagina: number;
  limite: number;
  total: number;
  onCambiar: (pagina: number) => void;
}) => {
  if (total <= limite) return null;
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(pagina * limite, total);
  return (
    <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4 text-sm">
      <span className="tabular-nums text-muted-foreground">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onCambiar(pagina - 1)}
          aria-label="Página anterior"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={hasta >= total}
          onClick={() => onCambiar(pagina + 1)}
          aria-label="Página siguiente"
          title="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

/** Secciones y filas del panel lateral (mismo formato que ClientDetailSheet). */
export const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <section className="space-y-3 border-t border-border pt-5">
    <h3 className="eyebrow">{titulo}</h3>
    <dl className="space-y-2">{children}</dl>
  </section>
);

export const Dato = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-start gap-3 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 break-words">{children}</dd>
  </div>
);

/** "26/11/2026 14:05" en hora de Argentina. */
export const fechaHora = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    : '—';

/** "26/11/2026" a partir de YYYY-MM-DD o de un ISO. */
export const fechaCorta = (valor: string | null) => {
  if (!valor) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-');
    return `${d}/${m}/${a}`;
  }
  return fechaHora(valor).slice(0, 10);
};

/** Hook simple de móvil (el resto del admin usa el mismo corte de 768px). */
export const ANCHO_MOVIL = 768;
