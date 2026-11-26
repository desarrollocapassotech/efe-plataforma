import type { Objetivo } from '@efe/shared/schemas';
import { ChevronDown, ChevronRight, Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { ObjetivoPanel } from '../components/ObjetivoPanel';
import { TarjetaObjetivo } from '../components/TarjetaObjetivo';
import { useObjetivos } from '../hooks';

export function ObjetivosPage() {
  const objetivos = useObjetivos();
  const [nuevo, setNuevo] = useState(false);
  const lista = objetivos.data ?? [];
  const activos = lista.filter((o) => o.estado === 'ACTIVO');
  const otros = lista.filter((o) => o.estado !== 'ACTIVO');

  return (
    <Pagina titulo="Objetivos">
      {objetivos.isPending ? (
        <Cargando />
      ) : objetivos.isError ? (
        <ErrorCarga
          mensaje={objetivos.error.message}
          onReintentar={() => void objetivos.refetch()}
        />
      ) : lista.length === 0 ? (
        <Vacio
          icono={Target}
          titulo="¿Para qué querés ahorrar?"
          texto="Un viaje, el auto, un fondo para emergencias… Ponele un monto y te ayudamos a llegar."
          accion={
            <Button onClick={() => setNuevo(true)}>
              <Plus /> Crear objetivo
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {activos.map((o) => (
              <li key={o.id}>
                <TarjetaObjetivo objetivo={o} />
              </li>
            ))}
          </ul>
          <Button className="w-full" size="lg" onClick={() => setNuevo(true)}>
            <Plus /> Nuevo objetivo
          </Button>
          {otros.length > 0 && <Otros objetivos={otros} />}
        </>
      )}
      <ObjetivoPanel abierto={nuevo} onCerrar={() => setNuevo(false)} objetivo={null} />
    </Pagina>
  );
}

function Otros({ objetivos }: { objetivos: Objetivo[] }) {
  const [ver, setVer] = useState(false);
  return (
    <section>
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={ver}
      >
        {ver ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Cumplidos y archivados ({objetivos.length})
      </button>
      {ver && (
        <ul className="mt-2 space-y-3">
          {objetivos.map((o) => (
            <li key={o.id}>
              <TarjetaObjetivo objetivo={o} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
