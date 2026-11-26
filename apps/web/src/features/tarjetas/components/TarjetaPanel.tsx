import { COLORES_CATEGORIA } from '@efe/shared/categorias';
import type { RedTarjeta, Tarjeta } from '@efe/shared/schemas';
import { Archive, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ColorPicker } from '@/components/ColorPicker';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { ErrorFormulario } from '@/features/movimientos/components/Selectores';
import { esApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { useActualizarTarjeta, useBorrarTarjeta, useCrearTarjeta } from '../hooks';
import { REDES } from '../redes';

interface TarjetaPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  tarjeta: Tarjeta | null;
}

export function TarjetaPanel({ abierto, onCerrar, tarjeta }: TarjetaPanelProps) {
  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && onCerrar()}
      titulo={tarjeta ? 'Editar tarjeta' : 'Nueva tarjeta'}
    >
      {abierto && <Formulario key={tarjeta?.id ?? 'nueva'} tarjeta={tarjeta} onListo={onCerrar} />}
    </Panel>
  );
}

const soloDia = (v: string) => v.replace(/\D/g, '').slice(0, 2);

function Formulario({ tarjeta, onListo }: { tarjeta: Tarjeta | null; onListo: () => void }) {
  const [nombre, setNombre] = useState(tarjeta?.nombre ?? '');
  const [red, setRed] = useState<RedTarjeta>(tarjeta?.red ?? 'VISA');
  const [ultimos4, setUltimos4] = useState(tarjeta?.ultimos4 ?? '');
  const [diaCierre, setDiaCierre] = useState(tarjeta ? String(tarjeta.diaCierre) : '');
  const [diaVencimiento, setDiaVencimiento] = useState(
    tarjeta ? String(tarjeta.diaVencimiento) : '',
  );
  const [color, setColor] = useState<string>(tarjeta?.color ?? COLORES_CATEGORIA[0]!);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<'eliminar' | 'archivar' | null>(null);

  const crear = useCrearTarjeta();
  const actualizar = useActualizarTarjeta();
  const borrar = useBorrarTarjeta();
  const guardando = crear.isPending || actualizar.isPending;

  const guardar = async () => {
    setError(null);
    const cierre = Number(diaCierre);
    const vencimiento = Number(diaVencimiento);
    if (!nombre.trim()) return setError('Poné un nombre, ej. "Visa Galicia".');
    if (!(cierre >= 1 && cierre <= 31)) return setError('El día de cierre va de 1 a 31.');
    if (!(vencimiento >= 1 && vencimiento <= 31)) {
      return setError('El día de vencimiento va de 1 a 31.');
    }
    if (ultimos4 && !/^\d{4}$/.test(ultimos4)) return setError('Los últimos 4 son 4 números.');
    const datos = {
      nombre: nombre.trim(),
      red,
      ultimos4: ultimos4 || null,
      diaCierre: cierre,
      diaVencimiento: vencimiento,
      color,
    };
    try {
      if (tarjeta) await actualizar.mutateAsync({ id: tarjeta.id, datos });
      else await crear.mutateAsync(datos);
      toast.success(tarjeta ? 'Tarjeta actualizada' : 'Tarjeta agregada');
      onListo();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const archivar = async (archivada: boolean) => {
    if (!tarjeta) return;
    try {
      await actualizar.mutateAsync({ id: tarjeta.id, datos: { archivada } });
      toast.success(archivada ? 'Tarjeta archivada' : 'Tarjeta restaurada');
      setConfirmar(null);
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!tarjeta) return;
    try {
      await borrar.mutateAsync(tarjeta.id);
      toast.success('Tarjeta eliminada');
      setConfirmar(null);
      onListo();
    } catch (e) {
      if (esApiError(e, 'TARJETA_CON_COMPRAS')) setConfirmar('archivar');
      else toast.error((e as Error).message);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="tarjeta-nombre">Nombre</Label>
        <Input
          id="tarjeta-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Visa Galicia"
          maxLength={40}
          autoFocus={!tarjeta}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Marca</legend>
        <div className="flex flex-wrap gap-2">
          {REDES.map((r) => (
            <button
              key={r.red}
              type="button"
              aria-pressed={red === r.red}
              onClick={() => setRed(r.red)}
              className={cn(
                'h-9 rounded-full border px-3 text-sm font-medium transition',
                red === r.red
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {r.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tarjeta-cierre">Día de cierre</Label>
          <Input
            id="tarjeta-cierre"
            inputMode="numeric"
            placeholder="Ej. 25"
            value={diaCierre}
            onChange={(e) => setDiaCierre(soloDia(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tarjeta-vencimiento">Día de vencimiento</Label>
          <Input
            id="tarjeta-vencimiento"
            inputMode="numeric"
            placeholder="Ej. 5"
            value={diaVencimiento}
            onChange={(e) => setDiaVencimiento(soloDia(e.target.value))}
          />
        </div>
        <p className="col-span-2 text-xs text-muted-foreground">
          Están en el resumen del banco. Lo que comprás hasta el cierre se paga en el vencimiento
          siguiente. Si un mes cambian, lo corregís desde el resumen.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tarjeta-ultimos4">Últimos 4 números (opcional)</Label>
        <Input
          id="tarjeta-ultimos4"
          inputMode="numeric"
          className="w-28"
          placeholder="1234"
          value={ultimos4}
          onChange={(e) => setUltimos4(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Color</span>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <ErrorFormulario mensaje={error} />

      <Button type="submit" size="lg" className="w-full" disabled={guardando}>
        {guardando && <Loader2 className="animate-spin" />}
        {tarjeta ? 'Guardar cambios' : 'Agregar tarjeta'}
      </Button>

      {tarjeta && (
        <div className="flex flex-col gap-1 border-t pt-4">
          {tarjeta.archivada ? (
            <Button type="button" variant="ghost" onClick={() => void archivar(false)}>
              <Archive /> Restaurar tarjeta
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setConfirmar('archivar')}>
              <Archive /> Archivar tarjeta
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmar('eliminar')}
          >
            <Trash2 /> Eliminar tarjeta
          </Button>
          <Confirmacion
            abierta={confirmar === 'eliminar'}
            onAbiertaChange={(a) => !a && setConfirmar(null)}
            titulo={`¿Eliminar "${tarjeta.nombre}"?`}
            mensaje="Se borra para siempre. Si tiene compras cargadas, te vamos a ofrecer archivarla."
            textoConfirmar="Eliminar"
            destructiva
            cargando={borrar.isPending}
            onConfirmar={() => void eliminar()}
          />
          <Confirmacion
            abierta={confirmar === 'archivar'}
            onAbiertaChange={(a) => !a && setConfirmar(null)}
            titulo={`¿Archivar "${tarjeta.nombre}"?`}
            mensaje="Deja de aparecer para cargar compras, pero conserva todo lo que tenía. La podés restaurar cuando quieras."
            textoConfirmar="Archivar"
            cargando={actualizar.isPending}
            onConfirmar={() => void archivar(true)}
          />
        </div>
      )}
    </form>
  );
}
