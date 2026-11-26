import { esCero } from '@efe/shared/dinero';
import { hoy as hoyAR } from '@efe/shared/fechas';
import type { Categoria, Cuenta, Recurrencia, TipoMovimiento } from '@efe/shared/schemas';
import { Loader2, Pause, Play, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { cuentaPorDefecto } from '@/features/movimientos/components/FormularioMovimiento';
import {
  ErrorFormulario,
  GrillaCategorias,
  OPCIONES_TIPO,
  Segmentado,
  SelectorCuenta,
} from '@/features/movimientos/components/Selectores';
import { useActualizarRecurrencia, useBorrarRecurrencia, useCrearRecurrencia } from '../hooks';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface RecurrenciaPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  recurrencia: Recurrencia | null;
  cuentas: Cuenta[];
  categorias: Categoria[];
}

export function RecurrenciaPanel({
  abierto,
  onCerrar,
  recurrencia,
  ...datos
}: RecurrenciaPanelProps) {
  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && onCerrar()}
      titulo={recurrencia ? 'Editar recurrente' : 'Nuevo recurrente'}
      descripcion={recurrencia ? undefined : 'Se carga solo, todos los meses o una vez por año.'}
    >
      {abierto && (
        <Formulario
          key={recurrencia?.id ?? 'nueva'}
          recurrencia={recurrencia}
          onListo={onCerrar}
          {...datos}
        />
      )}
    </Panel>
  );
}

function Formulario({
  recurrencia,
  cuentas,
  categorias,
  onListo,
}: Omit<RecurrenciaPanelProps, 'abierto' | 'onCerrar'> & { onListo: () => void }) {
  const hoy = hoyAR();
  const [tipo, setTipo] = useState<TipoMovimiento>(recurrencia?.tipo ?? 'GASTO');
  const [monto, setMonto] = useState(recurrencia?.monto ?? '');
  const [descripcion, setDescripcion] = useState(recurrencia?.descripcion ?? '');
  const [categoriaId, setCategoriaId] = useState<string | null>(recurrencia?.categoria?.id ?? null);
  const [cuentaId, setCuentaId] = useState<string | null>(
    recurrencia?.cuenta.id ?? cuentaPorDefecto(cuentas.filter((c) => !c.archivada)),
  );
  const [anual, setAnual] = useState(recurrencia?.frecuencia === 'ANUAL');
  const [dia, setDia] = useState(String(recurrencia?.diaDelMes ?? Number(hoy.slice(8, 10))));
  const [mes, setMes] = useState(recurrencia?.mesDelAnio ?? Number(hoy.slice(5, 7)));
  const [error, setError] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const crear = useCrearRecurrencia();
  const actualizar = useActualizarRecurrencia();
  const borrar = useBorrarRecurrencia();
  const guardando = crear.isPending || actualizar.isPending;

  const cuentasVisibles = cuentas.filter((c) => !c.archivada || c.id === recurrencia?.cuenta.id);
  const categoriasVisibles = categorias.filter(
    (c) => c.tipo === tipo && (!c.archivada || c.id === recurrencia?.categoria?.id),
  );
  const cuenta = cuentas.find((c) => c.id === cuentaId);

  const guardar = async () => {
    setError(null);
    const diaNum = Number(dia);
    if (!monto || esCero(monto)) return setError('Poné el monto.');
    if (!descripcion.trim()) return setError('Poné un nombre, ej. "Alquiler".');
    if (!cuenta) return setError('Elegí la cuenta.');
    if (!Number.isInteger(diaNum) || diaNum < 1 || diaNum > 31) {
      return setError('El día tiene que ser entre 1 y 31.');
    }
    const comun = {
      monto,
      descripcion: descripcion.trim(),
      categoriaId,
      cuentaId: cuenta.id,
      frecuencia: anual ? ('ANUAL' as const) : ('MENSUAL' as const),
      diaDelMes: diaNum,
      mesDelAnio: anual ? mes : null,
    };
    try {
      if (recurrencia) await actualizar.mutateAsync({ id: recurrencia.id, datos: comun });
      else await crear.mutateAsync({ ...comun, tipo, desde: hoy });
      toast.success(recurrencia ? 'Cambios guardados' : 'Listo, se va a cargar solo');
      onListo();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cambiarActiva = async (activa: boolean) => {
    if (!recurrencia) return;
    try {
      await actualizar.mutateAsync({ id: recurrencia.id, datos: { activa } });
      toast.success(
        activa ? 'Se vuelve a cargar solo' : 'Pausado: no se carga más hasta que lo reanudes',
      );
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!recurrencia) return;
    try {
      await borrar.mutateAsync(recurrencia.id);
      toast.success('Recurrente eliminado');
      setConfirmarBorrar(false);
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
        void guardar();
      }}
    >
      {!recurrencia && (
        <Segmentado
          etiqueta="Tipo"
          opciones={OPCIONES_TIPO}
          valor={tipo}
          onChange={(t) => {
            setTipo(t);
            setCategoriaId(null);
          }}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="recurrencia-nombre">Nombre</Label>
        <Input
          id="recurrencia-nombre"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={tipo === 'GASTO' ? 'Ej. Alquiler, Netflix' : 'Ej. Sueldo'}
          maxLength={200}
          autoFocus={!recurrencia}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurrencia-monto">Monto</Label>
        <MoneyInput
          id="recurrencia-monto"
          value={monto}
          onChange={setMonto}
          moneda={cuenta?.moneda ?? 'ARS'}
        />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿Cada cuánto?</h3>
        <Segmentado
          etiqueta="¿Cada cuánto?"
          opciones={[
            { valor: 'MENSUAL', nombre: 'Todos los meses' },
            { valor: 'ANUAL', nombre: 'Una vez por año' },
          ]}
          valor={anual ? 'ANUAL' : 'MENSUAL'}
          onChange={(v) => setAnual(v === 'ANUAL')}
        />
        <div className="flex items-center gap-2 text-sm">
          <Label htmlFor="recurrencia-dia">El día</Label>
          <Input
            id="recurrencia-dia"
            inputMode="numeric"
            className="w-16 text-center"
            value={dia}
            onChange={(e) => setDia(e.target.value.replace(/\D/g, '').slice(0, 2))}
          />
          {anual && (
            <>
              <span>de</span>
              <select
                aria-label="Mes"
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="h-11 rounded-md border border-input bg-card px-3"
              >
                {MESES.map((nombre, i) => (
                  <option key={nombre} value={i + 1}>
                    {nombre}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Si el mes no tiene ese día, se carga el último.
        </p>
      </section>

      {categoriasVisibles.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Categoría</h3>
          <GrillaCategorias
            categorias={categoriasVisibles}
            valor={categoriaId}
            onChange={setCategoriaId}
          />
        </section>
      )}

      {cuentasVisibles.length > 1 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Cuenta</h3>
          <SelectorCuenta cuentas={cuentasVisibles} valor={cuentaId} onChange={setCuentaId} />
        </section>
      )}

      {recurrencia && (
        <p className="text-xs text-muted-foreground">
          Los cambios rigen para lo que se cargue de ahora en adelante.
        </p>
      )}

      <ErrorFormulario mensaje={error} />

      <Button type="submit" size="lg" className="w-full" disabled={guardando}>
        {guardando && <Loader2 className="animate-spin" />}
        {recurrencia ? 'Guardar cambios' : 'Crear'}
      </Button>

      {recurrencia && (
        <div className="flex flex-col gap-1 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => void cambiarActiva(!recurrencia.activa)}
          >
            {recurrencia.activa ? <Pause /> : <Play />}
            {recurrencia.activa ? 'Pausar' : 'Reanudar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmarBorrar(true)}
          >
            <Trash2 /> Eliminar
          </Button>
          <Confirmacion
            abierta={confirmarBorrar}
            onAbiertaChange={setConfirmarBorrar}
            titulo={`¿Eliminar "${recurrencia.descripcion}"?`}
            mensaje="Deja de cargarse. Lo que ya se cargó en meses anteriores queda como está."
            textoConfirmar="Eliminar"
            destructiva
            cargando={borrar.isPending}
            onConfirmar={() => void eliminar()}
          />
        </div>
      )}
    </form>
  );
}
