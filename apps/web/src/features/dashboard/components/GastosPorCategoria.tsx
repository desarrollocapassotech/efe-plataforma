import { formatearMoneda } from '@efe/shared/dinero';
import type { ResumenMoneda } from '@efe/shared/schemas';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconoCategoria } from '@/features/categorias/components/IconoCategoria';
import { linkMovimientos } from '@/features/movimientos/filtros';
import { porcentajeRedondo } from '@/lib/formato';
import { resumirCategorias } from '../categorias';

/**
 * En qué se fue la plata: barras horizontales ordenadas de mayor a menor (se comparan
 * mejor que las porciones de una torta), cada una con el color de su categoría. Cada
 * fila lleva a la lista de movimientos del mes filtrada por esa categoría.
 */
export function GastosPorCategoria({
  resumen,
  periodo,
}: {
  resumen: ResumenMoneda;
  periodo: string;
}) {
  const filas = resumirCategorias(resumen.porCategoria, resumen.gastos);
  const maximo = Math.max(...filas.map((f) => Number(f.porcentaje ?? 0)), 1); // Solo geometría.

  return (
    <section
      aria-label="Gastos por categoría"
      className="space-y-3 rounded-xl border bg-card px-5 py-4"
    >
      <h2 className="font-semibold">¿En qué se fue la plata?</h2>
      <ul className="-mx-2">
        {filas.map((f) => {
          const destino = linkMovimientos({
            mes: periodo,
            tipo: 'GASTO',
            categoriaId: f.otras || !f.categoriaId ? undefined : f.categoriaId,
          });
          const ancho = (Number(f.porcentaje ?? 0) / maximo) * 100;
          return (
            <li key={f.categoriaId ?? f.nombre}>
              <Link
                to={destino}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-accent"
              >
                {f.icono && f.color ? (
                  <IconoCategoria icono={f.icono} color={f.color} tamano="sm" />
                ) : (
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground"
                    aria-hidden
                  >
                    {f.otras ? '…' : '?'}
                  </span>
                )}
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{f.nombre}</span>
                    <span className="shrink-0 font-semibold tabular-nums">
                      {formatearMoneda(f.total, resumen.moneda, { decimales: 0 })}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-muted-foreground"
                        style={{ width: `${ancho}%`, backgroundColor: f.color ?? undefined }}
                      />
                    </span>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {f.porcentaje ? porcentajeRedondo(f.porcentaje) : ''}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
