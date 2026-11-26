import { formatearMoneda, type Moneda } from '@efe/shared/dinero';
import type { PuntoEvolucion } from '@efe/shared/schemas';
import { lazy, Suspense } from 'react';
import { Cargando } from '@/components/Estados';
import { nombrePeriodo } from '@/lib/fechas-ui';

const GraficoEvolucion = lazy(() => import('./GraficoEvolucion'));

/** Últimos meses: gráfico + leyenda + la misma información como tabla (accesible). */
export function Evolucion({
  meses,
  moneda,
  periodoElegido,
  onElegir,
}: {
  meses: PuntoEvolucion[];
  moneda: Moneda;
  periodoElegido: string;
  onElegir: (periodo: string) => void;
}) {
  return (
    <section aria-label="Últimos meses" className="space-y-3 rounded-xl border bg-card px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Últimos {meses.length} meses</h2>
        <ul className="flex gap-3 text-xs text-muted-foreground" aria-label="Referencias">
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-chart-ingresos" aria-hidden /> Entró
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px] bg-chart-gastos" aria-hidden /> Gastaste
          </li>
        </ul>
      </div>

      <div aria-hidden>
        <Suspense fallback={<Cargando />}>
          <GraficoEvolucion
            meses={meses}
            moneda={moneda}
            periodoElegido={periodoElegido}
            onElegir={onElegir}
          />
        </Suspense>
      </div>

      <details className="group text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Ver los números
        </summary>
        <table className="mt-2 w-full text-right tabular-nums">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1 text-left font-medium">Mes</th>
              <th className="py-1 font-medium">Entró</th>
              <th className="py-1 font-medium">Gastaste</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {[...meses].reverse().map((m) => (
              <tr key={m.periodo}>
                <td className="py-1.5 text-left">{nombrePeriodo(m.periodo)}</td>
                <td className="py-1.5">{formatearMoneda(m.ingresos, moneda, { decimales: 0 })}</td>
                <td className="py-1.5">{formatearMoneda(m.gastos, moneda, { decimales: 0 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
