import type { ResumenTarjeta } from '@efe/shared/schemas';
import { Loader2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { ErrorFormulario } from '@/features/movimientos/components/Selectores';
import { nombrePeriodo } from '@/lib/fechas-ui';
import { useBorrarCierre, useGuardarCierre } from '../hooks';

/** Corregir las fechas de un resumen con las que dice el banco (override del período). */
export function CierrePanel({
  abierto,
  onCerrar,
  resumen,
}: {
  abierto: boolean;
  onCerrar: () => void;
  resumen: ResumenTarjeta;
}) {
  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && onCerrar()}
      titulo="Corregir fechas"
      descripcion={`Resumen de ${nombrePeriodo(resumen.periodo).toLowerCase()}`}
    >
      {abierto && <Formulario key={resumen.periodo} resumen={resumen} onListo={onCerrar} />}
    </Panel>
  );
}

function Formulario({ resumen, onListo }: { resumen: ResumenTarjeta; onListo: () => void }) {
  const [cierre, setCierre] = useState(resumen.fechaCierre);
  const [vencimiento, setVencimiento] = useState(resumen.fechaVencimiento);
  const [error, setError] = useState<string | null>(null);
  const guardar = useGuardarCierre();
  const borrar = useBorrarCierre();
  const ids = { tarjetaId: resumen.tarjeta.id, periodo: resumen.periodo };

  const enviar = async () => {
    setError(null);
    if (!cierre || !vencimiento) return setError('Completá las dos fechas.');
    if (vencimiento <= cierre) return setError('El vencimiento tiene que ser después del cierre.');
    try {
      await guardar.mutateAsync({
        ...ids,
        datos: { fechaCierre: cierre, fechaVencimiento: vencimiento },
      });
      toast.success('Fechas corregidas: acomodamos las compras');
      onListo();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const restaurar = async () => {
    try {
      await borrar.mutateAsync(ids);
      toast.success('Volvimos a las fechas de siempre');
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      <p className="text-sm text-muted-foreground">
        A veces el banco mueve el cierre o el vencimiento (feriados, fin de semana). Poné las fechas
        del resumen y acomodamos en qué resumen cae cada compra.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cierre-fecha">Cierre</Label>
          <Input
            id="cierre-fecha"
            type="date"
            value={cierre}
            onChange={(e) => setCierre(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vencimiento-fecha">Vencimiento</Label>
          <Input
            id="vencimiento-fecha"
            type="date"
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
          />
        </div>
      </div>
      <ErrorFormulario mensaje={error} />
      <Button type="submit" size="lg" className="w-full" disabled={guardar.isPending}>
        {guardar.isPending && <Loader2 className="animate-spin" />}
        Guardar fechas
      </Button>
      {resumen.fechasManuales && (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={borrar.isPending}
          onClick={() => void restaurar()}
        >
          <RotateCcw /> Volver a las fechas de siempre
        </Button>
      )}
    </form>
  );
}
