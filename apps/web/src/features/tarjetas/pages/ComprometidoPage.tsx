import { formatearMoneda, MONEDAS, type Moneda } from '@efe/shared/dinero';
import type { TarjetaResumida } from '@efe/shared/schemas';
import { ChevronRight, CreditCard } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { Pagina } from '@/components/Pantallas';
import { NOMBRE_MONEDA } from '@/features/cuentas/tipos';
import { Segmentado } from '@/features/movimientos/components/Selectores';
import { nombrePeriodo } from '@/lib/fechas-ui';
import { cn } from '@/lib/utils';
import { IconoTarjeta } from '../components/IconoTarjeta';
import { useCompromisos } from '../hooks';

const GraficoCompromisos = lazy(() => import('../components/GraficoCompromisos'));
const MESES = 12;

/** "Cuánto tengo comprometido": las cuotas de los próximos 12 meses, por tarjeta. */
export function ComprometidoPage() {
  const compromisos = useCompromisos(MESES);
  const [monedaElegida, setMonedaElegida] = useState<Moneda | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);

  const periodos = compromisos.data?.periodos ?? [];
  const disponibles = MONEDAS.filter((m) =>
    periodos.some((p) => p.totales.some((t) => t.moneda === m)),
  );
  const moneda =
    monedaElegida && disponibles.includes(monedaElegida) ? monedaElegida : disponibles[0];
  const tarjetas = new Map<string, TarjetaResumida>();
  for (const p of periodos)
    for (const t of p.porTarjeta) if (t.moneda === moneda) tarjetas.set(t.tarjeta.id, t.tarjeta);
  const conDatos = periodos.filter((p) => p.totales.some((t) => t.moneda === moneda));
  const periodoElegido = elegido ?? conDatos[0]?.periodo ?? null;
  const detalle = periodos.find((p) => p.periodo === periodoElegido);
  const totalDe = (p: (typeof periodos)[number]) =>
    p.totales.find((t) => t.moneda === moneda)?.total;

  return (
    <Pagina titulo="Comprometido" volverA="/tarjetas">
      <p className="text-sm text-muted-foreground">
        Lo que ya tenés que pagar en los próximos meses por las cuotas de tus tarjetas.
      </p>

      {compromisos.isPending ? (
        <Cargando />
      ) : compromisos.isError ? (
        <ErrorCarga
          mensaje={compromisos.error.message}
          onReintentar={() => void compromisos.refetch()}
        />
      ) : !moneda ? (
        <Vacio
          icono={CreditCard}
          titulo="No tenés cuotas por pagar"
          texto="Cuando cargues compras en cuotas, acá vas a ver cuánto te toca cada mes."
        />
      ) : (
        <>
          {disponibles.length > 1 && (
            <Segmentado
              etiqueta="Moneda"
              opciones={disponibles.map((m) => ({ valor: m, nombre: NOMBRE_MONEDA[m] }))}
              valor={moneda}
              onChange={setMonedaElegida}
            />
          )}

          <section
            aria-label="Comprometido por mes"
            className="space-y-3 rounded-xl border bg-card px-5 py-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">Próximos {MESES} meses</h2>
              {tarjetas.size > 1 && (
                <ul
                  className="flex flex-wrap gap-3 text-xs text-muted-foreground"
                  aria-label="Referencias"
                >
                  {[...tarjetas.values()].map((t) => (
                    <li key={t.id} className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[2px] bg-chart-ingresos"
                        style={t.color ? { backgroundColor: t.color } : undefined}
                        aria-hidden
                      />
                      {t.nombre}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div aria-hidden>
              <Suspense fallback={<Cargando />}>
                <GraficoCompromisos
                  periodos={periodos}
                  tarjetas={[...tarjetas.values()]}
                  moneda={moneda}
                  elegido={periodoElegido}
                  onElegir={setElegido}
                />
              </Suspense>
            </div>
          </section>

          {detalle && (
            <section className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-muted-foreground">
                {nombrePeriodo(detalle.periodo)}: {formatearMoneda(totalDe(detalle) ?? '0', moneda)}
              </h2>
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {detalle.porTarjeta
                  .filter((t) => t.moneda === moneda)
                  .map((t) => (
                    <li key={t.tarjeta.id}>
                      <Link
                        to={`/tarjetas/${t.tarjeta.id}?periodo=${detalle.periodo}`}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-accent"
                      >
                        <IconoTarjeta tarjeta={t.tarjeta} />
                        <span className="flex-1 font-medium">{t.tarjeta.nombre}</span>
                        <span className="font-semibold tabular-nums">
                          {formatearMoneda(t.total, moneda)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">Mes por mes</h2>
            <ul className="divide-y overflow-hidden rounded-lg border bg-card">
              {periodos.map((p) => (
                <li key={p.periodo}>
                  <button
                    type="button"
                    onClick={() => setElegido(p.periodo)}
                    aria-pressed={p.periodo === periodoElegido}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-accent',
                      p.periodo === periodoElegido && 'bg-primary/5 font-semibold',
                    )}
                  >
                    <span>{nombrePeriodo(p.periodo)}</span>
                    <span className="tabular-nums">
                      {totalDe(p) ? formatearMoneda(totalDe(p)!, moneda) : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Pagina>
  );
}
