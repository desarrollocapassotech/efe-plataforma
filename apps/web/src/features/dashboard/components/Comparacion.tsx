import { comparar, formatearMoneda, type Moneda } from '@efe/shared/dinero';
import { sumarPeriodos } from '@efe/shared/fechas';
import type { ResumenMoneda } from '@efe/shared/schemas';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { nombrePeriodo } from '@/lib/fechas-ui';
import { porcentajeRedondo } from '@/lib/formato';
import { cn } from '@/lib/utils';

/** Ingresos y gastos contra el mes anterior, con flecha + color (nunca solo color). */
export function Comparacion({ resumen, periodo }: { resumen: ResumenMoneda; periodo: string }) {
  const c = resumen.comparacionMesAnterior;
  const anterior = nombrePeriodo(sumarPeriodos(periodo, -1)).toLowerCase();
  return (
    <section
      aria-label={`Comparado con ${anterior}`}
      className="space-y-3 rounded-xl border bg-card px-5 py-4"
    >
      <h2 className="font-semibold">Comparado con {anterior}</h2>
      <ul className="space-y-2.5">
        <Fila
          etiqueta="Entró"
          variacion={c.variacionIngresos}
          anterior={c.ingresosAnterior}
          moneda={resumen.moneda}
          subirEsBueno
        />
        <Fila
          etiqueta="Gastaste"
          variacion={c.variacionGastos}
          anterior={c.gastosAnterior}
          moneda={resumen.moneda}
          subirEsBueno={false}
        />
      </ul>
    </section>
  );
}

function Fila({
  etiqueta,
  variacion,
  anterior,
  moneda,
  subirEsBueno,
}: {
  etiqueta: string;
  variacion: string | null;
  anterior: string;
  moneda: Moneda;
  subirEsBueno: boolean;
}) {
  const sentido = variacion === null ? 0 : comparar(variacion, 0);
  const bueno = sentido !== 0 && sentido > 0 === subirEsBueno;
  const Icono = sentido > 0 ? ArrowUpRight : sentido < 0 ? ArrowDownRight : Minus;
  const texto =
    variacion === null
      ? 'Sin datos del mes anterior'
      : sentido === 0
        ? 'Igual que el mes anterior'
        : `${sentido > 0 ? 'Subió' : 'Bajó'} ${porcentajeRedondo(variacion.replace('-', ''))}`;

  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          sentido === 0 || variacion === null
            ? 'bg-muted text-muted-foreground'
            : bueno
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive',
        )}
        aria-hidden
      >
        <Icono className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {etiqueta}: {texto}
        </span>
        <span className="block text-xs text-muted-foreground">
          El mes anterior: {formatearMoneda(anterior, moneda, { decimales: 0 })}
        </span>
      </span>
    </li>
  );
}
