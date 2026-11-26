import { Plus } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Cargando, ErrorCarga } from '@/components/Estados';
import { Panel } from '@/components/ui/panel';
import { useCategorias } from '@/features/categorias/hooks';
import { useCuentas } from '@/features/cuentas/hooks';
import { CargaRapidaContext, type PedidoCarga } from '../carga-rapida-context';
import { FormularioMovimiento } from './FormularioMovimiento';
import { FormularioTransferencia } from './FormularioTransferencia';

function tituloDe(pedido: PedidoCarga): string {
  switch (pedido.modo) {
    case 'nuevo':
      return 'Cargar';
    case 'editar':
      return pedido.movimiento.tipo === 'GASTO' ? 'Editar gasto' : 'Editar ingreso';
    case 'transferencia':
      return pedido.transferencia ? 'Editar movimiento entre cuentas' : 'Pasar plata entre cuentas';
  }
}

/**
 * Panel único de carga (gasto, ingreso, transferencia) + botón flotante "+" siempre a
 * mano en la zona privada. Cualquier pantalla puede abrirlo con useCargaRapida().
 */
export function CargaRapidaProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<PedidoCarga | null>(null);
  const [abierto, setAbierto] = useState(false);
  // Cambia en cada apertura: el formulario arranca de cero.
  const [apertura, setApertura] = useState(0);

  const valor = useMemo(
    () => ({
      abrir: (nuevo: PedidoCarga) => {
        setPedido(nuevo);
        setApertura((n) => n + 1);
        setAbierto(true);
      },
    }),
    [],
  );

  return (
    <CargaRapidaContext.Provider value={valor}>
      {children}

      <button
        type="button"
        onClick={() => valor.abrir({ modo: 'nuevo', tipo: 'GASTO' })}
        aria-label="Cargar gasto o ingreso"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition hover:bg-primary-hover active:scale-95 lg:bottom-8 lg:right-8 lg:h-16 lg:w-16"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      {pedido && (
        <Panel abierto={abierto} onAbiertoChange={setAbierto} titulo={tituloDe(pedido)}>
          {abierto && (
            <ContenidoCarga
              key={apertura}
              pedido={pedido}
              onListo={() => setAbierto(false)}
              onCambiar={valor.abrir}
            />
          )}
        </Panel>
      )}
    </CargaRapidaContext.Provider>
  );
}

function ContenidoCarga({
  pedido,
  onListo,
  onCambiar,
}: {
  pedido: PedidoCarga;
  onListo: () => void;
  onCambiar: (pedido: PedidoCarga) => void;
}) {
  const cuentas = useCuentas();
  const categorias = useCategorias();

  if (cuentas.isPending || categorias.isPending) return <Cargando />;
  if (cuentas.isError || categorias.isError) {
    return (
      <ErrorCarga
        onReintentar={() => {
          void cuentas.refetch();
          void categorias.refetch();
        }}
      />
    );
  }

  if (pedido.modo === 'transferencia') {
    return (
      <FormularioTransferencia
        transferencia={pedido.transferencia}
        cuentas={cuentas.data}
        onListo={onListo}
      />
    );
  }

  return (
    <FormularioMovimiento
      inicial={pedido.modo === 'editar' ? pedido.movimiento : { tipo: pedido.tipo }}
      cuentas={cuentas.data}
      categorias={categorias.data}
      onListo={onListo}
      onTransferir={() => onCambiar({ modo: 'transferencia' })}
    />
  );
}
