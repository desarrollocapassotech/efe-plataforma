import { esCero } from '@efe/shared/dinero';
import { hoy as hoyAR } from '@efe/shared/fechas';
import type { Categoria, Cuenta, Movimiento, TipoMovimiento } from '@efe/shared/schemas';
import { ArrowLeftRight, Link2Off, Loader2, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PieFijo } from '@/components/ui/panel';
import { useCrearRecurrencia } from '@/features/recurrencias/hooks';
import { guardarPreferencia, leerPreferencia } from '@/lib/preferencias';
import { cn } from '@/lib/utils';
import { useActualizarMovimiento, useBorrarMovimiento, useCrearMovimiento } from '../hooks';
import {
  ErrorFormulario,
  GrillaCategorias,
  OPCIONES_TIPO,
  Segmentado,
  SelectorCuenta,
  SelectorFecha,
} from './Selectores';

export const PREFERENCIA_ULTIMA_CUENTA = 'ultimaCuenta';

/** Cuenta por defecto: la última usada (si sigue activa) o la primera. */
export function cuentaPorDefecto(cuentas: Cuenta[]): string | null {
  const ultima = leerPreferencia(PREFERENCIA_ULTIMA_CUENTA);
  return cuentas.find((c) => c.id === ultima)?.id ?? cuentas[0]?.id ?? null;
}

interface FormularioMovimientoProps {
  /** Alta (con el tipo inicial) o edición de un movimiento existente. */
  inicial: { tipo: TipoMovimiento } | Movimiento;
  cuentas: Cuenta[];
  categorias: Categoria[];
  onListo: () => void;
  onTransferir?: () => void;
}

/**
 * Carga de un gasto o ingreso pensada para hacerse en dos toques: el monto ya está
 * enfocado, la cuenta y la fecha vienen elegidas (última usada, hoy) y la categoría es un
 * toque en la grilla. Lo opcional (nota, repetir) va al final.
 */
export function FormularioMovimiento({
  inicial,
  cuentas,
  categorias,
  onListo,
  onTransferir,
}: FormularioMovimientoProps) {
  const existente = 'id' in inicial ? inicial : null;
  const [tipo, setTipo] = useState<TipoMovimiento>(inicial.tipo);
  const [monto, setMonto] = useState(existente?.monto ?? '');
  const [categoriaId, setCategoriaId] = useState<string | null>(existente?.categoria?.id ?? null);
  const [cuentaId, setCuentaId] = useState<string | null>(
    existente?.cuenta.id ?? cuentaPorDefecto(cuentas.filter((c) => !c.archivada)),
  );
  const [fecha, setFecha] = useState(existente?.fecha ?? hoyAR());
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [repetir, setRepetir] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const crear = useCrearMovimiento();
  const crearRecurrencia = useCrearRecurrencia();
  const actualizar = useActualizarMovimiento();
  const borrar = useBorrarMovimiento();
  const guardando = crearRecurrencia.isPending || actualizar.isPending;

  // Activas + (al editar) la cuenta/categoría actual aunque esté archivada.
  const cuentasVisibles = cuentas.filter((c) => !c.archivada || c.id === existente?.cuenta.id);
  const categoriasVisibles = categorias.filter(
    (c) => c.tipo === tipo && (!c.archivada || c.id === existente?.categoria?.id),
  );
  const cuenta = cuentas.find((c) => c.id === cuentaId) ?? null;
  const categoria = categorias.find((c) => c.id === categoriaId) ?? null;
  const nombreTipo = tipo === 'GASTO' ? 'gasto' : 'ingreso';

  const cambiarTipo = (nuevo: TipoMovimiento) => {
    setTipo(nuevo);
    setCategoriaId(null);
  };

  const guardar = async () => {
    setError(null);
    if (!monto || esCero(monto)) return setError('Poné cuánto fue.');
    if (!cuenta) return setError('Elegí de qué cuenta.');
    const nota = descripcion.trim();

    if (existente) {
      try {
        await actualizar.mutateAsync({
          id: existente.id,
          datos: { monto, cuentaId: cuenta.id, categoriaId, fecha, descripcion: nota || null },
        });
        toast.success('Cambios guardados');
        onListo();
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }

    guardarPreferencia(PREFERENCIA_ULTIMA_CUENTA, cuenta.id);

    if (repetir) {
      // Se crea la recurrencia: la API genera en el momento el movimiento de este mes.
      const dia = Number(fecha.slice(8, 10));
      try {
        await crearRecurrencia.mutateAsync({
          cuentaId: cuenta.id,
          categoriaId,
          tipo,
          monto,
          descripcion:
            nota || categoria?.nombre || (tipo === 'GASTO' ? 'Gasto fijo' : 'Ingreso fijo'),
          frecuencia: 'MENSUAL',
          diaDelMes: dia,
          desde: fecha,
        });
        toast.success(`Listo: se va a cargar solo todos los ${dia} de cada mes`);
        onListo();
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }

    // Alta optimista: se cierra al toque y aparece en la lista; si falla, avisa.
    crear.mutate({
      datos: { tipo, monto, cuentaId: cuenta.id, categoriaId, fecha, descripcion: nota || null },
      cuenta: { id: cuenta.id, nombre: cuenta.nombre, tipo: cuenta.tipo, moneda: cuenta.moneda },
      categoria: categoria
        ? {
            id: categoria.id,
            nombre: categoria.nombre,
            color: categoria.color,
            icono: categoria.icono,
          }
        : null,
    });
    toast.success(tipo === 'GASTO' ? 'Gasto guardado' : 'Ingreso guardado');
    onListo();
  };

  const eliminar = async () => {
    if (!existente) return;
    try {
      await borrar.mutateAsync(existente.id);
      toast.success(tipo === 'GASTO' ? 'Gasto eliminado' : 'Ingreso eliminado');
      setConfirmarBorrar(false);
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (cuentasVisibles.length === 0) {
    return (
      <div className="space-y-4 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          Para cargar un {nombreTipo} primero necesitás una cuenta (efectivo, banco…).
        </p>
        <Button asChild className="w-full">
          <Link to="/mas/cuentas" onClick={onListo}>
            Crear una cuenta
          </Link>
        </Button>
      </div>
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
      {!existente && (
        <Segmentado
          etiqueta="¿Qué querés cargar?"
          opciones={OPCIONES_TIPO}
          valor={tipo}
          onChange={cambiarTipo}
        />
      )}

      <div className="space-y-2">
        <Label htmlFor="movimiento-monto" className="sr-only">
          Monto
        </Label>
        <MoneyInput
          id="movimiento-monto"
          value={monto}
          onChange={setMonto}
          moneda={cuenta?.moneda ?? 'ARS'}
          tamano="grande"
          autoFocus={!existente}
          invalido={error === 'Poné cuánto fue.'}
        />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">{tipo === 'GASTO' ? '¿En qué?' : '¿De qué?'}</h3>
        {categoriasVisibles.length > 0 ? (
          <GrillaCategorias
            categorias={categoriasVisibles}
            valor={categoriaId}
            onChange={setCategoriaId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No tenés categorías de {nombreTipo}s. Podés crearlas en Más → Categorías.
          </p>
        )}
      </section>

      {cuentasVisibles.length > 1 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">
            {tipo === 'GASTO' ? '¿Con qué pagaste?' : '¿Dónde entró?'}
          </h3>
          <SelectorCuenta cuentas={cuentasVisibles} valor={cuentaId} onChange={setCuentaId} />
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿Cuándo?</h3>
        <SelectorFecha valor={fecha} onChange={setFecha} />
      </section>

      <div className="space-y-2">
        <Label htmlFor="movimiento-nota">Nota (opcional)</Label>
        <Input
          id="movimiento-nota"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={tipo === 'GASTO' ? 'Ej. Súper del finde' : 'Ej. Sueldo de noviembre'}
          maxLength={200}
        />
      </div>

      {!existente && (
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3">
          <Repeat className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-sm">
            <span className="block font-medium">Se repite todos los meses</span>
            <span className="block text-muted-foreground">
              Lo cargamos solos cada mes, el mismo día.
            </span>
          </span>
          <input
            type="checkbox"
            checked={repetir}
            onChange={(e) => setRepetir(e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
        </label>
      )}

      {existente?.recurrenciaId && (
        <p className="flex gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          <Link2Off className="mt-0.5 h-4 w-4 shrink-0" />
          Este {nombreTipo} se cargó solo porque se repite todos los meses. Si lo cambiás, los meses
          que vienen se siguen cargando igual.
        </p>
      )}

      <ErrorFormulario mensaje={error} />

      {!existente && onTransferir && cuentas.filter((c) => !c.archivada).length > 1 && (
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onTransferir}
        >
          <ArrowLeftRight /> Pasar plata entre tus cuentas
        </Button>
      )}

      {existente && (
        <>
          <div className={cn('border-t pt-4')}>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setConfirmarBorrar(true)}
            >
              <Trash2 /> Eliminar {nombreTipo}
            </Button>
          </div>
          <Confirmacion
            abierta={confirmarBorrar}
            onAbiertaChange={setConfirmarBorrar}
            titulo={`¿Eliminar este ${nombreTipo}?`}
            mensaje="Se borra para siempre y el saldo de la cuenta se recalcula."
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
          {existente ? 'Guardar cambios' : `Guardar ${nombreTipo}`}
        </Button>
      </PieFijo>
    </form>
  );
}
