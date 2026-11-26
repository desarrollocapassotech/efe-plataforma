import type { Categoria, Cuenta } from '@efe/shared/schemas';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel, PieFijo } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import type { FiltrosLista, TipoFiltro } from '../filtros';
import { GrillaCategorias, Segmentado } from './Selectores';

const OPCIONES: { valor: TipoFiltro | 'TODO'; nombre: string }[] = [
  { valor: 'TODO', nombre: 'Todo' },
  { valor: 'GASTO', nombre: 'Gastos' },
  { valor: 'INGRESO', nombre: 'Ingresos' },
  { valor: 'TRANSFERENCIA', nombre: 'Entre cuentas' },
];

interface FiltrosPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  filtros: FiltrosLista;
  cuentas: Cuenta[];
  categorias: Categoria[];
  onAplicar: (filtros: FiltrosLista) => void;
}

export function FiltrosPanel({ abierto, onCerrar, ...props }: FiltrosPanelProps) {
  return (
    <Panel abierto={abierto} onAbiertoChange={(a) => !a && onCerrar()} titulo="Filtrar">
      {abierto && <Formulario {...props} onCerrar={onCerrar} />}
    </Panel>
  );
}

function Formulario({
  filtros,
  cuentas,
  categorias,
  onAplicar,
  onCerrar,
}: Omit<FiltrosPanelProps, 'abierto'>) {
  const [borrador, setBorrador] = useState(filtros);
  const tipoCategorias = borrador.tipo === 'INGRESO' ? 'INGRESO' : 'GASTO';
  const aplicar = (f: FiltrosLista) => {
    onAplicar(f);
    onCerrar();
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        aplicar(borrador);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="filtro-buscar">Buscar en las notas</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filtro-buscar"
            type="search"
            className="pl-9"
            value={borrador.q ?? ''}
            onChange={(e) => setBorrador((b) => ({ ...b, q: e.target.value || undefined }))}
            placeholder="Ej. súper"
            maxLength={100}
          />
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Qué mostrar</h3>
        <Segmentado
          etiqueta="Qué mostrar"
          opciones={OPCIONES}
          valor={borrador.tipo ?? 'TODO'}
          onChange={(v) =>
            setBorrador((b) => ({
              ...b,
              tipo: v === 'TODO' ? undefined : v,
              // La categoría es de un tipo: si cambia el tipo, se suelta.
              categoriaId: undefined,
            }))
          }
        />
      </section>

      {cuentas.length > 1 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Cuenta</h3>
          <div className="flex flex-wrap gap-2">
            {[{ id: undefined, nombre: 'Todas' }, ...cuentas].map((c) => (
              <button
                key={c.id ?? 'todas'}
                type="button"
                aria-pressed={borrador.cuentaId === c.id}
                onClick={() => setBorrador((b) => ({ ...b, cuentaId: c.id }))}
                className={cn(
                  'h-9 rounded-full border px-3 text-sm font-medium transition',
                  borrador.cuentaId === c.id
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'text-muted-foreground hover:bg-accent',
                )}
              >
                {c.nombre}
              </button>
            ))}
          </div>
        </section>
      )}

      {borrador.tipo !== 'TRANSFERENCIA' && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            Categoría{' '}
            {borrador.tipo ? '' : <span className="text-muted-foreground">(de gastos)</span>}
          </h3>
          <GrillaCategorias
            categorias={categorias.filter((c) => c.tipo === tipoCategorias)}
            valor={borrador.categoriaId ?? null}
            onChange={(id) => setBorrador((b) => ({ ...b, categoriaId: id ?? undefined }))}
          />
        </section>
      )}

      <PieFijo className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => aplicar({ mes: filtros.mes })}
        >
          Limpiar
        </Button>
        <Button type="submit" className="flex-1">
          Ver resultados
        </Button>
      </PieFijo>
    </form>
  );
}
