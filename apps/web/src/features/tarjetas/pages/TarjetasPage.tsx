import { esCero, formatearMoneda } from '@efe/shared/dinero';
import { hoy as hoyAR, sumarPeriodos } from '@efe/shared/fechas';
import type { Tarjeta } from '@efe/shared/schemas';
import { resumenDelPeriodo } from '@efe/shared/tarjetas';
import { BarChart3, ChevronDown, ChevronRight, CreditCard, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { nombreDia } from '@/lib/fechas-ui';
import { cn } from '@/lib/utils';
import { IconoTarjeta } from '../components/IconoTarjeta';
import { TarjetaPanel } from '../components/TarjetaPanel';
import { useTarjetas } from '../hooks';
import { diasEntre } from '../redes';

export function TarjetasPage() {
  const tarjetas = useTarjetas();
  const [panel, setPanel] = useState<{ abierto: boolean; tarjeta: Tarjeta | null }>({
    abierto: false,
    tarjeta: null,
  });
  const [verArchivadas, setVerArchivadas] = useState(false);
  const activas = tarjetas.data?.filter((t) => !t.archivada) ?? [];
  const archivadas = tarjetas.data?.filter((t) => t.archivada) ?? [];
  const abrir = (tarjeta: Tarjeta | null) => setPanel({ abierto: true, tarjeta });

  return (
    <Pagina
      titulo="Tarjetas"
      accion={
        activas.length > 0 && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/tarjetas/comprometido">
              <BarChart3 /> Comprometido
            </Link>
          </Button>
        )
      }
    >
      {tarjetas.isPending ? (
        <Cargando />
      ) : tarjetas.isError ? (
        <ErrorCarga mensaje={tarjetas.error.message} onReintentar={() => void tarjetas.refetch()} />
      ) : activas.length === 0 && archivadas.length === 0 ? (
        <Vacio
          icono={CreditCard}
          titulo="Agregá tu tarjeta de crédito"
          texto="Cargás cada compra (en cuotas o en un pago) y te decimos cuánto vas a pagar en cada resumen."
          accion={
            <Button onClick={() => abrir(null)}>
              <Plus /> Agregar tarjeta
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {activas.map((t) => (
              <li key={t.id}>
                <TarjetaCard tarjeta={t} />
              </li>
            ))}
          </ul>

          <Button className="w-full" size="lg" onClick={() => abrir(null)}>
            <Plus /> Agregar tarjeta
          </Button>

          {archivadas.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setVerArchivadas((v) => !v)}
                className="flex w-full items-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                aria-expanded={verArchivadas}
              >
                {verArchivadas ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Archivadas ({archivadas.length})
              </button>
              {verArchivadas && (
                <ul className="mt-2 space-y-2">
                  {archivadas.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => abrir(t)}
                        className="flex w-full items-center gap-3 rounded-lg border bg-card px-4 py-3 text-left opacity-70 hover:bg-accent"
                      >
                        <IconoTarjeta tarjeta={t} />
                        <span className="font-medium">{t.nombre}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <TarjetaPanel
        abierto={panel.abierto}
        tarjeta={panel.tarjeta}
        onCerrar={() => setPanel((p) => ({ ...p, abierto: false }))}
      />
    </Pagina>
  );
}

/** Estado del ciclo: cuántos días faltan para el cierre (o para el vencimiento, si ya cerró). */
function cicloDe(t: Tarjeta, hoy: string) {
  const { fechaCierre, fechaVencimiento, periodo } = t.proximoResumen;
  if (hoy > fechaCierre) {
    return { cerro: true, dias: diasEntre(hoy, fechaVencimiento), avance: 100 };
  }
  const anterior = resumenDelPeriodo(sumarPeriodos(periodo, -1), t).fechaCierre;
  const total = Math.max(diasEntre(anterior, fechaCierre), 1);
  const pasaron = Math.min(Math.max(diasEntre(anterior, hoy), 0), total);
  return { cerro: false, dias: diasEntre(hoy, fechaCierre), avance: (pasaron / total) * 100 };
}

function TarjetaCard({ tarjeta: t }: { tarjeta: Tarjeta }) {
  const hoy = hoyAR();
  const ciclo = cicloDe(t, hoy);
  const pendientes = t.proximoResumen.saldos.filter((s) => !esCero(s.pendiente));
  const dias = (n: number) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);

  return (
    <Link
      to={`/tarjetas/${t.id}`}
      className="block space-y-3 rounded-xl border bg-card px-4 py-4 transition hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <IconoTarjeta tarjeta={t} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{t.nombre}</span>
          {t.ultimos4 && (
            <span className="block text-xs text-muted-foreground">•••• {t.ultimos4}</span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          A pagar el {nombreDia(t.proximoResumen.fechaVencimiento, hoy).toLowerCase()}
        </p>
        {pendientes.length === 0 ? (
          <p className="text-lg font-semibold">
            {t.proximoResumen.saldos.length > 0 ? 'Pagado ✓' : 'Nada por ahora'}
          </p>
        ) : (
          <p className="text-2xl font-semibold">
            {pendientes.map((s) => formatearMoneda(s.pendiente, s.moneda)).join(' + ')}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className={cn('h-full rounded-full', ciclo.cerro ? 'bg-gold' : 'bg-primary')}
            style={{ width: `${ciclo.avance}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {ciclo.cerro
            ? `Ya cerró: lo que compres ahora va al resumen siguiente. Vence ${dias(ciclo.dias)}.`
            : `Cierra ${dias(ciclo.dias)}`}
        </p>
      </div>
    </Link>
  );
}
