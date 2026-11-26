import { esCero, formatearMoneda, type Moneda } from '@efe/shared/dinero';
import { hoy as hoyAR } from '@efe/shared/fechas';
import type { Categoria, CuotaDeResumen, Tarjeta } from '@efe/shared/schemas';
import { CalendarClock, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PieFijo } from '@/components/ui/panel';
import {
  ErrorFormulario,
  GrillaCategorias,
  Segmentado,
  SelectorFecha,
} from '@/features/movimientos/components/Selectores';
import { diaYMes, nombrePeriodo } from '@/lib/fechas-ui';
import { guardarPreferencia, leerPreferencia } from '@/lib/preferencias';
import { cn } from '@/lib/utils';
import { useActualizarCompra, useBorrarCompra, useCrearCompra } from '../hooks';
import { totalDesdeCuota, vistaPrevia } from '../vista-previa';
import { IconoTarjeta } from './IconoTarjeta';

const PREFERENCIA_ULTIMA_TARJETA = 'ultimaTarjeta';
const CUOTAS_RAPIDAS = [1, 3, 6, 12, 18];

/** Una compra existente, tal como viene en el detalle del resumen. */
export interface CompraExistente {
  tarjetaId: string;
  cuota: CuotaDeResumen;
}

interface FormularioCompraProps {
  existente?: CompraExistente;
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  onListo: () => void;
}

/**
 * Compra con tarjeta: tarjeta, monto (total o por cuota), cuotas, categoría, fecha y qué
 * fue. Antes de guardar muestra en qué resumen cae la primera cuota y la última.
 */
export function FormularioCompra({
  existente,
  tarjetas,
  categorias,
  onListo,
}: FormularioCompraProps) {
  const activas = tarjetas.filter((t) => !t.archivada || t.id === existente?.tarjetaId);
  const ultima = leerPreferencia(PREFERENCIA_ULTIMA_TARJETA);
  const c = existente?.cuota;

  const [tarjetaId, setTarjetaId] = useState<string | null>(
    existente?.tarjetaId ?? activas.find((t) => t.id === ultima)?.id ?? activas[0]?.id ?? null,
  );
  const [modoMonto, setModoMonto] = useState<'TOTAL' | 'CUOTA'>('TOTAL');
  const [monto, setMonto] = useState(c?.montoTotal ?? '');
  const [moneda, setMoneda] = useState<Moneda>(c?.moneda ?? 'ARS');
  const [cuotas, setCuotas] = useState(c?.cantidadCuotas ?? 1);
  const [otraCantidad, setOtraCantidad] = useState(
    c && !CUOTAS_RAPIDAS.includes(c.cantidadCuotas) ? String(c.cantidadCuotas) : '',
  );
  const [categoriaId, setCategoriaId] = useState<string | null>(c?.categoria?.id ?? null);
  const [fecha, setFecha] = useState(c?.fechaCompra ?? hoyAR());
  const [descripcion, setDescripcion] = useState(c?.descripcion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const crear = useCrearCompra();
  const actualizar = useActualizarCompra();
  const borrar = useBorrarCompra();
  const guardando = crear.isPending || actualizar.isPending;

  const tarjeta = activas.find((t) => t.id === tarjetaId);
  const categoriasGasto = categorias.filter(
    (x) => x.tipo === 'GASTO' && (!x.archivada || x.id === c?.categoria?.id),
  );
  const categoria = categorias.find((x) => x.id === categoriaId);
  const montoTotal =
    monto && modoMonto === 'CUOTA' && cuotas > 1 ? totalDesdeCuota(monto, cuotas) : monto;
  const previa = tarjeta
    ? vistaPrevia({ fecha, montoTotal, cantidadCuotas: cuotas }, tarjeta)
    : null;

  const guardar = async () => {
    setError(null);
    if (!tarjeta) return setError('Elegí la tarjeta.');
    if (!monto || esCero(monto)) return setError('Poné cuánto fue.');
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 72) {
      return setError('Las cuotas van de 1 a 72.');
    }
    const datos = {
      tarjetaId: tarjeta.id,
      categoriaId,
      descripcion: descripcion.trim() || categoria?.nombre || 'Compra con tarjeta',
      fecha,
      montoTotal,
      moneda,
      cantidadCuotas: cuotas,
    };
    try {
      if (existente) await actualizar.mutateAsync({ id: existente.cuota.compraId, datos });
      else await crear.mutateAsync(datos);
      guardarPreferencia(PREFERENCIA_ULTIMA_TARJETA, tarjeta.id);
      toast.success(existente ? 'Compra actualizada' : 'Compra guardada');
      onListo();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!existente) return;
    try {
      await borrar.mutateAsync(existente.cuota.compraId);
      toast.success('Compra eliminada');
      setConfirmarBorrar(false);
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (activas.length === 0) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          Para cargar una compra con tarjeta primero agregá tu tarjeta (con su día de cierre y de
          vencimiento).
        </p>
        <Button asChild className="w-full">
          <Link to="/tarjetas" onClick={onListo}>
            Agregar tarjeta
          </Link>
        </Button>
      </div>
    );
  }

  const chip = (activo: boolean) =>
    cn(
      'h-10 min-w-12 rounded-full border px-3 text-sm font-medium transition',
      activo
        ? 'border-primary bg-primary/5 text-foreground'
        : 'text-muted-foreground hover:bg-accent',
    );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      {activas.length > 1 && (
        <div
          role="radiogroup"
          aria-label="Tarjeta"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {activas.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === tarjetaId}
              onClick={() => setTarjetaId(t.id)}
              className={cn(
                'flex h-12 shrink-0 items-center gap-2 rounded-lg border px-2 pr-3 text-sm font-medium transition',
                t.id === tarjetaId
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <IconoTarjeta tarjeta={t} className="h-7 w-10" />
              {t.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="compra-monto" className="sr-only">
          {modoMonto === 'CUOTA' && cuotas > 1 ? 'Valor de cada cuota' : 'Monto total'}
        </Label>
        <MoneyInput
          id="compra-monto"
          value={monto}
          onChange={setMonto}
          moneda={moneda}
          tamano="grande"
          autoFocus={!existente}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2" role="radiogroup" aria-label="Moneda">
            {(['ARS', 'USD'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={moneda === m}
                onClick={() => setMoneda(m)}
                className={cn(chip(moneda === m), 'h-8 text-xs')}
              >
                {m === 'ARS' ? 'Pesos' : 'Dólares'}
              </button>
            ))}
          </div>
          {cuotas > 1 && modoMonto === 'CUOTA' && monto && (
            <span className="text-sm text-muted-foreground">
              Total: {formatearMoneda(montoTotal, moneda)}
            </span>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿En cuántas cuotas?</h3>
        <div className="flex flex-wrap gap-2">
          {CUOTAS_RAPIDAS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={cuotas === n && !otraCantidad}
              onClick={() => {
                setCuotas(n);
                setOtraCantidad('');
              }}
              className={chip(cuotas === n && !otraCantidad)}
            >
              {n === 1 ? '1 pago' : n}
            </button>
          ))}
          <Input
            aria-label="Otra cantidad de cuotas"
            inputMode="numeric"
            placeholder="Otra"
            className={cn('h-10 w-20 rounded-full text-center', otraCantidad && 'border-primary')}
            value={otraCantidad}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 2);
              setOtraCantidad(v);
              if (v) setCuotas(Number(v));
            }}
          />
        </div>
        {cuotas > 1 && (
          <Segmentado
            etiqueta="El monto es"
            opciones={[
              { valor: 'TOTAL', nombre: 'Puse el total' },
              { valor: 'CUOTA', nombre: 'Puse cada cuota' },
            ]}
            valor={modoMonto}
            onChange={setModoMonto}
          />
        )}
      </section>

      {previa && (
        <p className="flex gap-2 rounded-md bg-muted px-3 py-2.5 text-sm">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <span>
            {cuotas > 1 ? 'La primera cuota' : 'Se paga'} en el resumen que vence el{' '}
            <strong>
              {diaYMes(
                Number(previa.primera.fechaVencimiento.slice(8)),
                Number(previa.primera.fechaVencimiento.slice(5, 7)),
              )}
            </strong>
            {cuotas > 1 && (
              <>
                {' '}
                y la última en <strong>
                  {nombrePeriodo(previa.ultimoPeriodo).toLowerCase()}
                </strong>{' '}
                ({formatearMoneda(previa.cuotas[0]!.monto, moneda)} por mes)
              </>
            )}
            .
          </span>
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿En qué?</h3>
        <GrillaCategorias
          categorias={categoriasGasto}
          valor={categoriaId}
          onChange={setCategoriaId}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿Cuándo?</h3>
        <SelectorFecha valor={fecha} onChange={setFecha} />
      </section>

      <div className="space-y-2">
        <Label htmlFor="compra-nota">¿Qué compraste? (opcional)</Label>
        <Input
          id="compra-nota"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Heladera"
          maxLength={200}
        />
      </div>

      <ErrorFormulario mensaje={error} />

      {existente && (
        <div className="border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => setConfirmarBorrar(true)}
          >
            <Trash2 /> Eliminar compra
          </Button>
          <Confirmacion
            abierta={confirmarBorrar}
            onAbiertaChange={setConfirmarBorrar}
            titulo="¿Eliminar esta compra?"
            mensaje="Se borran todas sus cuotas, de todos los resúmenes."
            textoConfirmar="Eliminar"
            destructiva
            cargando={borrar.isPending}
            onConfirmar={() => void eliminar()}
          />
        </div>
      )}

      <PieFijo>
        <Button type="submit" size="lg" className="w-full" disabled={guardando}>
          {guardando && <Loader2 className="animate-spin" />}
          {existente ? 'Guardar cambios' : 'Guardar compra'}
        </Button>
      </PieFijo>
    </form>
  );
}
