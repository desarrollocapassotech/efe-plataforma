import { comparar, esCero, formatearMoneda, type Moneda } from '@efe/shared/dinero';
import { hoy, periodoDe } from '@efe/shared/fechas';
import type { Objetivo } from '@efe/shared/schemas';
import { Archive, CheckCircle2, Lightbulb, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmojiPicker } from '@/components/EmojiPicker';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { useEvolucion } from '@/features/dashboard/hooks';
import { ErrorFormulario } from '@/features/movimientos/components/Selectores';
import { useMe } from '@/features/perfil/hooks';
import { cn } from '@/lib/utils';
import { useActualizarObjetivo, useBorrarObjetivo, useCrearObjetivo } from '../hooks';
import { fondoSugerido, gastoPromedio, PLANTILLAS, type ClavePlantilla } from '../plantillas';

interface ObjetivoPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  objetivo: Objetivo | null;
}

/** Alta (primero se elige una plantilla) o edición de un objetivo. */
export function ObjetivoPanel({ abierto, onCerrar, objetivo }: ObjetivoPanelProps) {
  const [plantilla, setPlantilla] = useState<ClavePlantilla | null>(null);
  const cerrar = () => {
    onCerrar();
    setPlantilla(null);
  };
  const enPlantillas = !objetivo && !plantilla;

  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && cerrar()}
      titulo={
        objetivo ? 'Editar objetivo' : enPlantillas ? '¿Para qué querés ahorrar?' : 'Nuevo objetivo'
      }
    >
      {abierto &&
        (enPlantillas ? (
          <div className="grid grid-cols-2 gap-2">
            {PLANTILLAS.map((p) => (
              <button
                key={p.clave}
                type="button"
                onClick={() => setPlantilla(p.clave)}
                className="flex flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left transition hover:bg-accent"
              >
                <span className="text-2xl" aria-hidden>
                  {p.icono}
                </span>
                <span className="text-sm font-medium">{p.nombre}</span>
                <span className="text-xs text-muted-foreground">{p.ayuda}</span>
              </button>
            ))}
          </div>
        ) : (
          <Formulario
            key={objetivo?.id ?? plantilla ?? 'nuevo'}
            objetivo={objetivo}
            plantilla={plantilla}
            onListo={cerrar}
          />
        ))}
    </Panel>
  );
}

function Formulario({
  objetivo,
  plantilla,
  onListo,
}: {
  objetivo: Objetivo | null;
  plantilla: ClavePlantilla | null;
  onListo: () => void;
}) {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const base = PLANTILLAS.find((p) => p.clave === plantilla);
  const [nombre, setNombre] = useState(
    objetivo?.nombre ?? (base && base.clave !== 'otro' ? base.nombre : ''),
  );
  const [icono, setIcono] = useState(objetivo?.icono ?? base?.icono ?? '🎯');
  const [monto, setMonto] = useState(objetivo?.montoObjetivo ?? '');
  const [moneda, setMoneda] = useState<Moneda>(objetivo?.moneda ?? me?.monedaPrincipal ?? 'ARS');
  const [fecha, setFecha] = useState(objetivo?.fechaObjetivo ?? '');
  const [planeado, setPlaneado] = useState(objetivo?.aporteMensualPlaneado ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  const crear = useCrearObjetivo();
  const actualizar = useActualizarObjetivo();
  const borrar = useBorrarObjetivo();
  const guardando = crear.isPending || actualizar.isPending;

  // Fondo de emergencia: 3 a 6 meses del gasto promedio (6 meses cerrados + el actual).
  const esEmergencia = plantilla === 'emergencia';
  const mesActual = periodoDe(hoy());
  const evolucion = useEvolucion(7, mesActual);
  const serie = evolucion.data?.monedas.find((m) => m.moneda === moneda)?.meses ?? [];
  const promedio = esEmergencia ? gastoPromedio(serie, mesActual) : null;

  const guardar = async () => {
    setError(null);
    if (!nombre.trim()) return setError('Poné un nombre.');
    if (!monto || esCero(monto)) return setError('Poné cuánto querés juntar.');
    if (fecha && fecha <= hoy()) return setError('La fecha tiene que ser más adelante.');
    const datos = {
      nombre: nombre.trim(),
      icono,
      montoObjetivo: monto,
      moneda,
      fechaObjetivo: fecha || null,
      aporteMensualPlaneado: planeado && !esCero(planeado) ? planeado : null,
    };
    try {
      if (objetivo) {
        await actualizar.mutateAsync({ id: objetivo.id, datos });
        toast.success('Objetivo actualizado');
        onListo();
      } else {
        const creado = await crear.mutateAsync(datos);
        toast.success('¡Objetivo creado!');
        onListo();
        void navigate(`/objetivos/${creado.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const cambiarEstado = async (estado: 'ACTIVO' | 'CUMPLIDO' | 'ARCHIVADO') => {
    if (!objetivo) return;
    try {
      await actualizar.mutateAsync({ id: objetivo.id, datos: { estado } });
      toast.success(
        estado === 'CUMPLIDO'
          ? '¡Felicitaciones! 🎉'
          : estado === 'ARCHIVADO'
            ? 'Objetivo archivado'
            : 'Objetivo activo de nuevo',
      );
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!objetivo) return;
    try {
      await borrar.mutateAsync(objetivo.id);
      toast.success('Objetivo eliminado');
      setConfirmar(false);
      onListo();
      void navigate('/objetivos');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const completo = objetivo && comparar(objetivo.avance.porcentaje, 100) >= 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="objetivo-nombre">Nombre</Label>
        <div className="flex gap-2">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border text-2xl"
            aria-hidden
          >
            {icono}
          </span>
          <Input
            id="objetivo-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Vacaciones en la costa"
            maxLength={60}
            autoFocus={!objetivo && plantilla === 'otro'}
          />
        </div>
      </div>

      {(plantilla === 'otro' || objetivo) && (
        <div className="space-y-2">
          <span className="text-sm font-medium">Ícono</span>
          <EmojiPicker value={icono} onChange={setIcono} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="objetivo-monto">¿Cuánto querés juntar?</Label>
        <MoneyInput
          id="objetivo-monto"
          value={monto}
          onChange={setMonto}
          moneda={moneda}
          tamano="grande"
        />
        <div className="flex gap-2" role="radiogroup" aria-label="Moneda">
          {(['ARS', 'USD'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={moneda === m}
              onClick={() => setMoneda(m)}
              className={cn(
                'h-8 rounded-full border px-3 text-xs font-medium transition',
                moneda === m
                  ? 'border-primary bg-primary/5'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {m === 'ARS' ? 'Pesos' : 'Dólares'}
            </button>
          ))}
        </div>
      </div>

      {esEmergencia && (
        <div className="space-y-3 rounded-lg bg-muted px-4 py-3 text-sm">
          <p className="flex gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              Un fondo de emergencia te cubre si se corta un ingreso o aparece un gasto imprevisto.
              Lo recomendable es tener <strong>de 3 a 6 meses de tus gastos</strong>.
            </span>
          </p>
          {promedio ? (
            <>
              <p className="text-muted-foreground">
                Gastás en promedio {formatearMoneda(promedio, moneda, { decimales: 0 })} por mes.
              </p>
              <div className="flex flex-wrap gap-2">
                {([3, 6] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMonto(fondoSugerido(promedio, n))}
                    className="rounded-full border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent"
                  >
                    {n} meses:{' '}
                    {formatearMoneda(fondoSugerido(promedio, n), moneda, { decimales: 0 })}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Cuando tengas algunos meses de gastos cargados, te sugerimos un monto.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="objetivo-fecha">¿Para cuándo? (opcional)</Label>
        <Input
          id="objetivo-fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Con fecha te decimos cuánto ahorrar por mes.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="objetivo-planeado">¿Cuánto pensás ahorrar por mes? (opcional)</Label>
        <MoneyInput
          id="objetivo-planeado"
          value={planeado}
          onChange={setPlaneado}
          moneda={moneda}
        />
        <p className="text-xs text-muted-foreground">
          Si no lo ponés, calculamos con lo que vengas aportando.
        </p>
      </div>

      <ErrorFormulario mensaje={error} />

      <Button type="submit" size="lg" className="w-full" disabled={guardando}>
        {guardando && <Loader2 className="animate-spin" />}
        {objetivo ? 'Guardar cambios' : 'Crear objetivo'}
      </Button>

      {objetivo && (
        <div className="flex flex-col gap-1 border-t pt-4">
          {completo && objetivo.estado === 'ACTIVO' && (
            <Button type="button" variant="ghost" onClick={() => void cambiarEstado('CUMPLIDO')}>
              <CheckCircle2 /> Marcar como cumplido
            </Button>
          )}
          {objetivo.estado === 'ACTIVO' ? (
            <Button type="button" variant="ghost" onClick={() => void cambiarEstado('ARCHIVADO')}>
              <Archive /> Archivar
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => void cambiarEstado('ACTIVO')}>
              <Archive /> Volver a activo
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmar(true)}
          >
            <Trash2 /> Eliminar
          </Button>
          <Confirmacion
            abierta={confirmar}
            onAbiertaChange={setConfirmar}
            titulo={`¿Eliminar "${objetivo.nombre}"?`}
            mensaje="Se borra el objetivo con todos sus aportes. La plata de tus cuentas no cambia."
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
