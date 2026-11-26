import type { Recurrencia } from '@efe/shared/schemas';
import { Plus, Repeat } from 'lucide-react';
import { useState } from 'react';
import { CurrencyAmount } from '@/components/CurrencyAmount';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { IconoCategoria } from '@/features/categorias/components/IconoCategoria';
import { useCategorias } from '@/features/categorias/hooks';
import { useCuentas } from '@/features/cuentas/hooks';
import { diaYMes, nombreDia } from '@/lib/fechas-ui';
import { cn } from '@/lib/utils';
import { RecurrenciaPanel } from '../components/RecurrenciaPanel';
import { useRecurrencias } from '../hooks';

/** "Cada mes, el día 5" / "Cada año, el 5 de marzo". */
export function textoFrecuencia(r: Pick<Recurrencia, 'frecuencia' | 'diaDelMes' | 'mesDelAnio'>) {
  return r.frecuencia === 'ANUAL' && r.mesDelAnio
    ? `Cada año, el ${diaYMes(r.diaDelMes, r.mesDelAnio)}`
    : `Cada mes, el día ${r.diaDelMes}`;
}

export function RecurrentesPage() {
  const recurrencias = useRecurrencias();
  const cuentas = useCuentas();
  const categorias = useCategorias();
  const [panel, setPanel] = useState<{ abierto: boolean; recurrencia: Recurrencia | null }>({
    abierto: false,
    recurrencia: null,
  });
  const abrir = (recurrencia: Recurrencia | null) => setPanel({ abierto: true, recurrencia });

  const lista = recurrencias.data ?? [];
  const grupos = [
    { titulo: 'Gastos fijos', items: lista.filter((r) => r.activa && r.tipo === 'GASTO') },
    { titulo: 'Ingresos fijos', items: lista.filter((r) => r.activa && r.tipo === 'INGRESO') },
    { titulo: 'Pausados', items: lista.filter((r) => !r.activa) },
  ].filter((g) => g.items.length > 0);

  return (
    <Pagina titulo="Recurrentes" volverA="/mas">
      <p className="text-sm text-muted-foreground">
        Lo que se repite (sueldo, alquiler, servicios) se carga solo el día que corresponde.
      </p>

      {recurrencias.isPending ? (
        <Cargando />
      ) : recurrencias.isError ? (
        <ErrorCarga
          mensaje={recurrencias.error.message}
          onReintentar={() => void recurrencias.refetch()}
        />
      ) : grupos.length === 0 ? (
        <Vacio
          icono={Repeat}
          titulo="No tenés nada que se repita"
          texto="Por ejemplo, el sueldo o el alquiler: lo cargás una vez y después se carga solo."
          accion={
            <Button onClick={() => abrir(null)}>
              <Plus /> Agregar
            </Button>
          }
        />
      ) : (
        <>
          {grupos.map((g) => (
            <section key={g.titulo} className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-muted-foreground">{g.titulo}</h2>
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {g.items.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => abrir(r)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent',
                        !r.activa && 'opacity-70',
                      )}
                    >
                      {r.categoria ? (
                        <IconoCategoria
                          icono={r.categoria.icono}
                          color={r.categoria.color}
                          tamano="sm"
                        />
                      ) : (
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                          aria-hidden
                        >
                          <Repeat className="h-4 w-4" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.descripcion}</span>
                        <span className="block text-sm text-muted-foreground">
                          {textoFrecuencia(r)}
                        </span>
                        {r.proximaFecha && (
                          <span className="block text-xs text-muted-foreground">
                            Próximo: {nombreDia(r.proximaFecha).toLowerCase()}
                          </span>
                        )}
                      </span>
                      <CurrencyAmount
                        valor={r.monto}
                        moneda={r.moneda}
                        className={cn('font-semibold', r.tipo === 'INGRESO' && 'text-success')}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <Button className="w-full" size="lg" onClick={() => abrir(null)}>
            <Plus /> Agregar recurrente
          </Button>
        </>
      )}

      <RecurrenciaPanel
        abierto={panel.abierto}
        recurrencia={panel.recurrencia}
        cuentas={cuentas.data ?? []}
        categorias={categorias.data ?? []}
        onCerrar={() => setPanel((p) => ({ ...p, abierto: false }))}
      />
    </Pagina>
  );
}
