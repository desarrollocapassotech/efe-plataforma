import type { Moneda } from '@efe/shared/dinero';
import type { Cuenta, TipoCuenta } from '@efe/shared/schemas';
import { Archive, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { esApiError } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { useActualizarCuenta, useBorrarCuenta, useCrearCuenta } from '../hooks';
import { NOMBRE_MONEDA, TIPOS_DE_CUENTA } from '../tipos';

interface CuentaPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Sin cuenta: alta. Con cuenta: edición. */
  cuenta?: Cuenta | null;
  monedaPorDefecto?: Moneda;
}

export function CuentaPanel({
  abierto,
  onCerrar,
  cuenta,
  monedaPorDefecto = 'ARS',
}: CuentaPanelProps) {
  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && onCerrar()}
      titulo={cuenta ? 'Editar cuenta' : 'Nueva cuenta'}
    >
      {/* key: el formulario arranca de cero cada vez que se abre con otra cuenta. */}
      {abierto && (
        <FormularioCuenta
          key={cuenta?.id ?? 'nueva'}
          cuenta={cuenta ?? null}
          monedaPorDefecto={monedaPorDefecto}
          onListo={onCerrar}
        />
      )}
    </Panel>
  );
}

function FormularioCuenta({
  cuenta,
  monedaPorDefecto,
  onListo,
}: {
  cuenta: Cuenta | null;
  monedaPorDefecto: Moneda;
  onListo: () => void;
}) {
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '');
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo ?? 'EFECTIVO');
  const [moneda, setMoneda] = useState<Moneda>(cuenta?.moneda ?? monedaPorDefecto);
  const [saldoInicial, setSaldoInicial] = useState(cuenta?.saldoInicial ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<'eliminar' | 'archivar' | null>(null);

  const crear = useCrearCuenta();
  const actualizar = useActualizarCuenta();
  const borrar = useBorrarCuenta();
  const guardando = crear.isPending || actualizar.isPending;

  const guardar = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('Poné un nombre para la cuenta.');
      return;
    }
    const datos = { nombre: nombre.trim(), tipo, moneda, saldoInicial: saldoInicial || '0' };
    try {
      if (cuenta) await actualizar.mutateAsync({ id: cuenta.id, datos });
      else await crear.mutateAsync(datos);
      toast.success(cuenta ? 'Cuenta actualizada' : 'Cuenta creada');
      onListo();
    } catch (e) {
      setError(
        esApiError(e, 'CUENTA_MONEDA_BLOQUEADA')
          ? 'No se puede cambiar la moneda porque la cuenta ya tiene movimientos.'
          : (e as Error).message,
      );
    }
  };

  const archivar = async (archivada: boolean) => {
    if (!cuenta) return;
    try {
      await actualizar.mutateAsync({ id: cuenta.id, datos: { archivada } });
      toast.success(archivada ? 'Cuenta archivada' : 'Cuenta restaurada');
      setConfirmar(null);
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!cuenta) return;
    try {
      await borrar.mutateAsync(cuenta.id);
      toast.success('Cuenta eliminada');
      setConfirmar(null);
      onListo();
    } catch (e) {
      // Con movimientos no se puede borrar: se ofrece archivar.
      if (esApiError(e, 'CUENTA_CON_MOVIMIENTOS')) setConfirmar('archivar');
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
        <Label htmlFor="cuenta-nombre">Nombre</Label>
        <Input
          id="cuenta-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Billetera, Banco Nación"
          maxLength={60}
          autoFocus={!cuenta}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Qué es?</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {TIPOS_DE_CUENTA.map((t) => (
            <button
              key={t.tipo}
              type="button"
              aria-pressed={tipo === t.tipo}
              onClick={() => setTipo(t.tipo)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition',
                tipo === t.tipo
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <span className="text-2xl" aria-hidden>
                {t.icono}
              </span>
              {t.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Moneda</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['ARS', 'USD'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={moneda === m}
              onClick={() => setMoneda(m)}
              className={cn(
                'h-11 rounded-lg border text-sm font-medium transition',
                moneda === m
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {NOMBRE_MONEDA[m]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="cuenta-saldo">¿Cuánta plata tenías al empezar?</Label>
        <MoneyInput
          id="cuenta-saldo"
          value={saldoInicial}
          onChange={setSaldoInicial}
          moneda={moneda}
          permitirNegativo
        />
        <p className="text-xs text-muted-foreground">
          Desde ahí calculamos el saldo con lo que vayas cargando.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={guardando}>
        {guardando && <Loader2 className="animate-spin" />}
        {cuenta ? 'Guardar cambios' : 'Crear cuenta'}
      </Button>

      {cuenta && (
        <div className="flex flex-col gap-1 border-t pt-4">
          {cuenta.archivada ? (
            <Button type="button" variant="ghost" onClick={() => void archivar(false)}>
              <Archive /> Restaurar cuenta
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setConfirmar('archivar')}>
              <Archive /> Archivar cuenta
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmar('eliminar')}
          >
            <Trash2 /> Eliminar cuenta
          </Button>
        </div>
      )}

      {cuenta && (
        <>
          <Confirmacion
            abierta={confirmar === 'eliminar'}
            onAbiertaChange={(a) => !a && setConfirmar(null)}
            titulo={`¿Eliminar "${cuenta.nombre}"?`}
            mensaje="Se borra para siempre. Si tiene movimientos, te vamos a ofrecer archivarla."
            textoConfirmar="Eliminar"
            destructiva
            cargando={borrar.isPending}
            onConfirmar={() => void eliminar()}
          />
          <Confirmacion
            abierta={confirmar === 'archivar'}
            onAbiertaChange={(a) => !a && setConfirmar(null)}
            titulo={`¿Archivar "${cuenta.nombre}"?`}
            mensaje="Deja de aparecer para cargar movimientos, pero conserva todo lo que ya tenía. La podés restaurar cuando quieras."
            textoConfirmar="Archivar"
            cargando={actualizar.isPending}
            onConfirmar={() => void archivar(true)}
          />
        </>
      )}
    </form>
  );
}
