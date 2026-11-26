import type { Categoria, TipoMovimiento } from '@efe/shared/schemas';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Cargando, ErrorCarga } from '@/components/Estados';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CategoriaPanel } from '../components/CategoriaPanel';
import { IconoCategoria } from '../components/IconoCategoria';
import { useCategorias, useOrdenarCategorias } from '../hooks';

const PESTANAS: { tipo: TipoMovimiento; nombre: string }[] = [
  { tipo: 'GASTO', nombre: 'Gastos' },
  { tipo: 'INGRESO', nombre: 'Ingresos' },
];

export function CategoriasPage() {
  const categorias = useCategorias();
  const [tipo, setTipo] = useState<TipoMovimiento>('GASTO');
  const [panel, setPanel] = useState<{ abierto: boolean; categoria: Categoria | null }>({
    abierto: false,
    categoria: null,
  });
  /** Orden en edición (ids); null = no se está ordenando. */
  const [ordenando, setOrdenando] = useState<string[] | null>(null);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const ordenar = useOrdenarCategorias();

  const delTipo = (categorias.data ?? []).filter((c) => c.tipo === tipo);
  const activas = delTipo.filter((c) => !c.archivada);
  const archivadas = delTipo.filter((c) => c.archivada);
  const abrir = (categoria: Categoria | null) => setPanel({ abierto: true, categoria });

  const mover = (indice: number, delta: -1 | 1) =>
    setOrdenando((ids) => {
      if (!ids) return ids;
      const nuevos = [...ids];
      const destino = indice + delta;
      if (destino < 0 || destino >= nuevos.length) return ids;
      [nuevos[indice], nuevos[destino]] = [nuevos[destino]!, nuevos[indice]!];
      return nuevos;
    });

  const guardarOrden = async () => {
    if (!ordenando) return;
    try {
      await ordenar.mutateAsync(ordenando.map((id, orden) => ({ id, orden })));
      setOrdenando(null);
      toast.success('Orden guardado');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Pagina
      titulo="Categorías"
      volverA="/mas"
      accion={
        activas.length > 1 &&
        (ordenando ? (
          <Button size="sm" onClick={() => void guardarOrden()} disabled={ordenar.isPending}>
            {ordenar.isPending && <Loader2 className="animate-spin" />}
            Listo
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOrdenando(activas.map((c) => c.id))}
          >
            Ordenar
          </Button>
        ))
      }
    >
      <div
        role="tablist"
        aria-label="Tipo de categoría"
        className="grid grid-cols-2 rounded-lg bg-muted p-1"
      >
        {PESTANAS.map((p) => (
          <button
            key={p.tipo}
            type="button"
            role="tab"
            aria-selected={tipo === p.tipo}
            onClick={() => {
              setTipo(p.tipo);
              setOrdenando(null);
            }}
            className={cn(
              'h-10 rounded-md text-sm font-medium transition',
              tipo === p.tipo ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {categorias.isPending ? (
        <Cargando />
      ) : categorias.isError ? (
        <ErrorCarga
          mensaje={categorias.error.message}
          onReintentar={() => void categorias.refetch()}
        />
      ) : ordenando ? (
        <section aria-label="Ordenar categorías" className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Subí las que más usás: aparecen primero al cargar un movimiento.
          </p>
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {ordenando.map((id, i) => {
              const c = activas.find((x) => x.id === id);
              if (!c) return null;
              return (
                <li key={id} className="flex items-center gap-3 px-4 py-2.5">
                  <IconoCategoria icono={c.icono} color={c.color} tamano="sm" />
                  <span className="flex-1 truncate font-medium">{c.nombre}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Subir ${c.nombre}`}
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Bajar ${c.nombre}`}
                    disabled={i === ordenando.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {activas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => abrir(c)}
                  className="flex w-full flex-col items-center gap-2 rounded-lg px-1 py-3 text-center transition hover:bg-accent"
                >
                  <IconoCategoria icono={c.icono} color={c.color} />
                  <span className="line-clamp-2 text-sm leading-tight">{c.nombre}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => abrir(null)}
                className="flex w-full flex-col items-center gap-2 rounded-lg px-1 py-3 text-center text-primary transition hover:bg-accent"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-primary/50">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium leading-tight">Nueva</span>
              </button>
            </li>
          </ul>

          {archivadas.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setVerArchivadas((v) => !v)}
                className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                aria-expanded={verArchivadas}
              >
                {verArchivadas ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Archivadas ({archivadas.length})
              </button>
              {verArchivadas && (
                <ul className="mt-2 divide-y overflow-hidden rounded-lg border bg-card">
                  {archivadas.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => abrir(c)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left opacity-70 transition hover:bg-accent"
                      >
                        <IconoCategoria icono={c.icono} color={c.color} tamano="sm" />
                        <span className="flex-1 truncate">{c.nombre}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <CategoriaPanel
        abierto={panel.abierto}
        categoria={panel.categoria}
        tipo={tipo}
        onCerrar={() => setPanel((p) => ({ ...p, abierto: false }))}
      />
    </Pagina>
  );
}
