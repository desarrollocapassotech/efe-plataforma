import { ChevronRight, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TarjetaObjetivo } from '@/features/objetivos/components/TarjetaObjetivo';
import { useObjetivos } from '@/features/objetivos/hooks';

/** Los 3 objetivos activos más nuevos, compactos. */
export function ObjetivosInicio() {
  const objetivos = useObjetivos();
  const activos = (objetivos.data ?? []).filter((o) => o.estado === 'ACTIVO').slice(0, 3);
  if (objetivos.isPending) return null;

  if (activos.length === 0) {
    return (
      <Link
        to="/objetivos"
        className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition hover:bg-accent"
      >
        <Target className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1">
          <span className="block text-sm font-medium">¿Para qué querés ahorrar?</span>
          <span className="block text-xs text-muted-foreground">
            Creá un objetivo y te decimos cuánto separar por mes.
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <section aria-label="Objetivos" className="space-y-1 rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Objetivos</h2>
        <Link to="/objetivos" className="text-sm font-medium text-primary hover:underline">
          Ver todos
        </Link>
      </div>
      <ul className="divide-y">
        {activos.map((o) => (
          <li key={o.id}>
            <TarjetaObjetivo objetivo={o} compacta />
          </li>
        ))}
      </ul>
    </section>
  );
}
