import { cotizacionImplicita, esCero, formatearMoneda } from '@efe/shared/dinero';
import { hoy as hoyAR } from '@efe/shared/fechas';
import type { Cuenta, Transferencia } from '@efe/shared/schemas';
import { ArrowDown, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PieFijo } from '@/components/ui/panel';
import {
  useActualizarTransferencia,
  useBorrarTransferencia,
  useCrearTransferencia,
} from '../hooks';
import { cuentaPorDefecto } from './FormularioMovimiento';
import { ErrorFormulario, SelectorCuenta, SelectorFecha } from './Selectores';

interface FormularioTransferenciaProps {
  transferencia?: Transferencia;
  cuentas: Cuenta[];
  onListo: () => void;
}

/**
 * Pasar plata entre cuentas propias. Si las monedas son distintas (comprar o vender
 * dólares), se piden los dos montos y se muestra la cotización que resulta.
 */
export function FormularioTransferencia({
  transferencia,
  cuentas,
  onListo,
}: FormularioTransferenciaProps) {
  const visibles = cuentas.filter(
    (c) =>
      !c.archivada ||
      c.id === transferencia?.cuentaOrigen.id ||
      c.id === transferencia?.cuentaDestino.id,
  );
  const [origenId, setOrigenId] = useState<string | null>(
    transferencia?.cuentaOrigen.id ?? cuentaPorDefecto(visibles),
  );
  const [destinoId, setDestinoId] = useState<string | null>(
    transferencia?.cuentaDestino.id ?? visibles.find((c) => c.id !== origenId)?.id ?? null,
  );
  const [montoOrigen, setMontoOrigen] = useState(transferencia?.montoOrigen ?? '');
  const [montoDestino, setMontoDestino] = useState(transferencia?.montoDestino ?? '');
  const [fecha, setFecha] = useState(transferencia?.fecha ?? hoyAR());
  const [descripcion, setDescripcion] = useState(transferencia?.descripcion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const crear = useCrearTransferencia();
  const actualizar = useActualizarTransferencia();
  const borrar = useBorrarTransferencia();
  const guardando = crear.isPending || actualizar.isPending;

  const origen = visibles.find((c) => c.id === origenId) ?? null;
  const destino = visibles.find((c) => c.id === destinoId) ?? null;
  const distintaMoneda = !!origen && !!destino && origen.moneda !== destino.moneda;
  const cotizacion =
    distintaMoneda && montoOrigen && montoDestino && !esCero(montoOrigen) && !esCero(montoDestino)
      ? cotizacionImplicita(
          { moneda: origen.moneda, monto: montoOrigen },
          { moneda: destino.moneda, monto: montoDestino },
        )
      : null;

  const elegirOrigen = (id: string) => {
    setOrigenId(id);
    if (id === destinoId) setDestinoId(visibles.find((c) => c.id !== id)?.id ?? null);
  };

  const guardar = async () => {
    setError(null);
    if (!origen || !destino) return setError('Elegí las dos cuentas.');
    if (origen.id === destino.id) return setError('Elegí dos cuentas distintas.');
    if (!montoOrigen || esCero(montoOrigen)) return setError('Poné cuánto pasaste.');
    if (distintaMoneda && (!montoDestino || esCero(montoDestino))) {
      return setError(`Poné cuánto llegó en ${destino.nombre}.`);
    }
    const datos = {
      cuentaOrigenId: origen.id,
      cuentaDestinoId: destino.id,
      montoOrigen,
      ...(distintaMoneda ? { montoDestino } : {}),
      fecha,
      descripcion: descripcion.trim() || null,
    };
    try {
      if (transferencia) {
        await actualizar.mutateAsync({
          id: transferencia.id,
          datos: { ...datos, montoDestino: distintaMoneda ? montoDestino : montoOrigen },
        });
      } else {
        await crear.mutateAsync(datos);
      }
      toast.success(transferencia ? 'Cambios guardados' : 'Listo, plata movida');
      onListo();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!transferencia) return;
    try {
      await borrar.mutateAsync(transferencia.id);
      toast.success('Movimiento entre cuentas eliminado');
      setConfirmarBorrar(false);
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (visibles.length < 2) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Para pasar plata entre cuentas necesitás tener al menos dos. Agregalas en Más → Cuentas.
      </p>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Sale de</h3>
        <SelectorCuenta
          etiqueta="Sale de"
          cuentas={visibles}
          valor={origenId}
          onChange={elegirOrigen}
        />
        <MoneyInput
          aria-describedby="transferencia-origen"
          value={montoOrigen}
          onChange={setMontoOrigen}
          moneda={origen?.moneda ?? 'ARS'}
          tamano="grande"
          autoFocus={!transferencia}
        />
        <span id="transferencia-origen" className="sr-only">
          Monto que sale
        </span>
      </section>

      <div className="flex justify-center text-muted-foreground" aria-hidden>
        <ArrowDown className="h-5 w-5" />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Entra en</h3>
        <SelectorCuenta
          etiqueta="Entra en"
          cuentas={visibles.filter((c) => c.id !== origenId)}
          valor={destinoId}
          onChange={setDestinoId}
        />
        {distintaMoneda && destino && (
          <div className="space-y-2">
            <Label htmlFor="transferencia-destino">¿Cuánto llegó?</Label>
            <MoneyInput
              id="transferencia-destino"
              value={montoDestino}
              onChange={setMontoDestino}
              moneda={destino.moneda}
            />
            {cotizacion && (
              <p className="text-sm text-muted-foreground">
                Te quedó un dólar a{' '}
                <span className="font-semibold text-foreground">
                  {formatearMoneda(cotizacion, 'ARS')}
                </span>
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿Cuándo?</h3>
        <SelectorFecha valor={fecha} onChange={setFecha} />
      </section>

      <div className="space-y-2">
        <Label htmlFor="transferencia-nota">Nota (opcional)</Label>
        <Input
          id="transferencia-nota"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Compra de dólares"
          maxLength={200}
        />
      </div>

      <ErrorFormulario mensaje={error} />

      {transferencia && (
        <>
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setConfirmarBorrar(true)}
            >
              <Trash2 /> Eliminar
            </Button>
          </div>
          <Confirmacion
            abierta={confirmarBorrar}
            onAbiertaChange={setConfirmarBorrar}
            titulo="¿Eliminar este movimiento entre cuentas?"
            mensaje="Se borra para siempre y los saldos de las dos cuentas se recalculan."
            textoConfirmar="Eliminar"
            destructiva
            cargando={borrar.isPending}
            onConfirmar={() => void eliminar()}
          />
        </>
      )}
      <PieFijo>
        <Button type="submit" size="lg" className="w-full" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {transferencia ? 'Guardar cambios' : 'Pasar plata'}
        </Button>
      </PieFijo>
    </form>
  );
}
