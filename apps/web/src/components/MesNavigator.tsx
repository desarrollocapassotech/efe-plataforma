import { sumarPeriodos, type Periodo } from '@efe/shared/fechas';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { nombrePeriodo } from '@/lib/fechas-ui';

/** Navegador de mes: ‹ Noviembre › (botones grandes para el pulgar). */
export function MesNavigator({
  periodo,
  onChange,
}: {
  periodo: Periodo;
  onChange: (periodo: Periodo) => void;
}) {
  const boton =
    'flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground';
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card px-1 py-1">
      <button
        type="button"
        className={boton}
        onClick={() => onChange(sumarPeriodos(periodo, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <p className="font-display text-base font-semibold" aria-live="polite">
        {nombrePeriodo(periodo)}
      </p>
      <button
        type="button"
        className={boton}
        onClick={() => onChange(sumarPeriodos(periodo, 1))}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
