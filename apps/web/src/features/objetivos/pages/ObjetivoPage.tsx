import { comparar, formatearMoneda } from '@efe/shared/dinero';
import type { Aporte } from '@efe/shared/schemas';
import { PiggyBank, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CurrencyAmount } from '@/components/CurrencyAmount';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { diaYMes, fechaCorta, nombrePeriodo } from '@/lib/fechas-ui';
import { porcentajeRedondo } from '@/lib/formato';
import { AportePanel } from '../components/AportePanel';
import { ObjetivoPanel } from '../components/ObjetivoPanel';
import { BarraAvance, EstadoObjetivo } from '../components/TarjetaObjetivo';
import { useBorrarAporte, useObjetivo } from '../hooks';

const fechaLarga = (f: string) =>
  `${diaYMes(Number(f.slice(8)), Number(f.slice(5, 7)))} de ${f.slice(0, 4)}`;

/** Detalle de un objetivo: avance, cuánto aportar, historial y el botón "Aportar". */
export function ObjetivoPage() {
  const { id = '' } = useParams();
  const objetivo = useObjetivo(id);
  const borrar = useBorrarAporte();
  const [aportar, setAportar] = useState(false);
  const [editar, setEditar] = useState(false);
  const [aBorrar, setABorrar] = useState<Aporte | null>(null);
  const o = objetivo.data;

  const confirmarBorrar = async () => {
    if (!aBorrar) return;
    try {
      await borrar.mutateAsync({ id, aporteId: aBorrar.id });
      toast.success('Aporte eliminado');
      setABorrar(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Pagina
      titulo={o?.nombre ?? 'Objetivo'}
      volverA="/objetivos"
      accion={
        o && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar objetivo"
            onClick={() => setEditar(true)}
          >
            <Pencil />
          </Button>
        )
      }
    >
      {objetivo.isPending ? (
        <Cargando />
      ) : objetivo.isError || !o ? (
        <ErrorCarga
          mensaje={objetivo.error?.message}
          onReintentar={() => void objetivo.refetch()}
        />
      ) : (
        <>
          <section className="space-y-4 rounded-xl bg-primary px-5 py-5 text-primary-foreground">
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden>
                {o.icono ?? '🎯'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm opacity-80">Llevás juntado</p>
                <p className="font-display text-3xl font-semibold">
                  {formatearMoneda(o.avance.acumulado, o.moneda, { decimales: 0 })}
                </p>
              </div>
              <p className="text-2xl font-semibold">{porcentajeRedondo(o.avance.porcentaje)}</p>
            </div>
            <BarraAvance porcentaje={o.avance.porcentaje} className="bg-primary-foreground/20" />
            <p className="text-sm opacity-90">
              Meta: {formatearMoneda(o.montoObjetivo, o.moneda, { decimales: 0 })}
              {o.fechaObjetivo && ` para el ${fechaLarga(o.fechaObjetivo)}`}
            </p>
          </section>

          <section className="space-y-3 rounded-xl border bg-card px-5 py-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">¿Cómo venís?</h2>
              <EstadoObjetivo objetivo={o} />
            </div>
            {comparar(o.avance.faltante, 0) === 0 ? (
              <p>¡Llegaste a la meta! Podés marcarlo como cumplido desde el lápiz de arriba.</p>
            ) : (
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Te faltan{' '}
                  <strong className="text-foreground">
                    {formatearMoneda(o.avance.faltante, o.moneda, { decimales: 0 })}
                  </strong>
                  .
                </li>
                {o.avance.aporteMensualSugerido && (
                  <li>
                    Para llegar a tiempo, aportá{' '}
                    <strong className="text-foreground">
                      {formatearMoneda(o.avance.aporteMensualSugerido, o.moneda, { decimales: 0 })}{' '}
                      por mes
                    </strong>
                    {o.avance.mesesRestantes
                      ? ` durante ${o.avance.mesesRestantes} ${o.avance.mesesRestantes === 1 ? 'mes' : 'meses'}`
                      : ''}
                    .
                  </li>
                )}
                <li>
                  {o.avance.fechaEstimada
                    ? `A este ritmo (${formatearMoneda(o.avance.ritmoMensual, o.moneda, { decimales: 0 })} por mes) llegás en ${nombrePeriodo(o.avance.fechaEstimada.slice(0, 7)).toLowerCase()}.`
                    : 'Todavía no hay aportes en los últimos 3 meses para estimar cuándo llegás.'}
                </li>
              </ul>
            )}
          </section>

          {o.estado !== 'ARCHIVADO' && (
            <Button size="lg" className="w-full" onClick={() => setAportar(true)}>
              <Plus /> Aportar
            </Button>
          )}

          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">Aportes</h2>
            {o.aportes.length === 0 ? (
              <Vacio
                icono={PiggyBank}
                titulo="Todavía no aportaste"
                texto="Cada vez que separes plata para esto, anotala acá."
              />
            ) : (
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {o.aportes.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {a.nota || (a.monto.startsWith('-') ? 'Retiro' : 'Aporte')}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {fechaCorta(a.fecha)}
                      </span>
                    </span>
                    <CurrencyAmount
                      valor={a.monto}
                      moneda={o.moneda}
                      colorearNegativo
                      className="font-semibold"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar aporte"
                      onClick={() => setABorrar(a)}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AportePanel abierto={aportar} onCerrar={() => setAportar(false)} objetivo={o} />
          <ObjetivoPanel abierto={editar} onCerrar={() => setEditar(false)} objetivo={o} />
        </>
      )}
      <Confirmacion
        abierta={aBorrar !== null}
        onAbiertaChange={(a) => !a && setABorrar(null)}
        titulo="¿Eliminar este aporte?"
        mensaje="El avance del objetivo se recalcula sin él."
        textoConfirmar="Eliminar"
        destructiva
        cargando={borrar.isPending}
        onConfirmar={() => void confirmarBorrar()}
      />
    </Pagina>
  );
}
