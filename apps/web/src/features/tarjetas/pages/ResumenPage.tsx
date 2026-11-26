import { esCero, formatearMoneda } from '@efe/shared/dinero';
import type { PagoResumen, SaldoResumen } from '@efe/shared/schemas';
import { CalendarDays, Pencil, Receipt, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CurrencyAmount } from '@/components/CurrencyAmount';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { MesNavigator } from '@/components/MesNavigator';
import { Pagina, PantallaError } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { IconoCategoria } from '@/features/categorias/components/IconoCategoria';
import { useCuentas } from '@/features/cuentas/hooks';
import { useCargaRapida } from '@/features/movimientos/carga-rapida-context';
import { fechaCorta, nombreDia, nombrePeriodo } from '@/lib/fechas-ui';
import { CierrePanel } from '../components/CierrePanel';
import { PagoPanel } from '../components/PagoPanel';
import { TarjetaPanel } from '../components/TarjetaPanel';
import { useBorrarPago, useResumenTarjeta, useTarjetas } from '../hooks';

/** Detalle del resumen de una tarjeta: fechas, cuotas, total, pagos y lo que falta pagar. */
export function ResumenPage() {
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const periodoUrl = searchParams.get('periodo') ?? undefined;
  const tarjetas = useTarjetas();
  const resumen = useResumenTarjeta(id, periodoUrl);
  const cuentas = useCuentas();
  const { abrir } = useCargaRapida();
  const borrarPago = useBorrarPago();

  const [editarTarjeta, setEditarTarjeta] = useState(false);
  const [corregirFechas, setCorregirFechas] = useState(false);
  const [pagar, setPagar] = useState<SaldoResumen | null>(null);
  const [pagoABorrar, setPagoABorrar] = useState<PagoResumen | null>(null);

  const tarjeta = tarjetas.data?.find((t) => t.id === id);
  const r = resumen.data;

  if (tarjetas.isSuccess && !tarjeta) {
    return (
      <PantallaError
        titulo="No encontramos la tarjeta"
        mensaje="Puede que la hayas borrado. Volvé a la lista de tarjetas."
      />
    );
  }

  const confirmarBorrarPago = async () => {
    if (!pagoABorrar) return;
    try {
      await borrarPago.mutateAsync(pagoABorrar.id);
      toast.success('Pago eliminado');
      setPagoABorrar(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Pagina
      titulo={tarjeta?.nombre ?? 'Tarjeta'}
      volverA="/tarjetas"
      accion={
        tarjeta && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar tarjeta"
            onClick={() => setEditarTarjeta(true)}
          >
            <Pencil />
          </Button>
        )
      }
    >
      {resumen.isPending ? (
        <Cargando />
      ) : resumen.isError ? (
        <ErrorCarga mensaje={resumen.error.message} onReintentar={() => void resumen.refetch()} />
      ) : !r ? null : (
        <div className={resumen.isPlaceholderData ? 'space-y-5 opacity-60' : 'space-y-5'}>
          <MesNavigator
            periodo={r.periodo}
            onChange={(periodo) => setSearchParams({ periodo }, { replace: true })}
          />

          <section className="space-y-4 rounded-xl bg-primary px-5 py-5 text-primary-foreground">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="opacity-80">Vence</p>
                <p className="font-semibold">{nombreDia(r.fechaVencimiento)}</p>
              </div>
              <div className="text-right">
                <p className="opacity-80">Cierra</p>
                <p className="font-semibold">{fechaCorta(r.fechaCierre)}</p>
              </div>
            </div>

            {r.saldos.length === 0 ? (
              <p className="text-lg font-semibold">No hay cuotas en este resumen</p>
            ) : (
              r.saldos.map((s) => (
                <div key={s.moneda} className="space-y-0.5">
                  <p className="text-sm opacity-80">
                    {esCero(s.pendiente) ? 'Pagado' : 'Te falta pagar'}
                    {r.saldos.length > 1 && (s.moneda === 'USD' ? ' en dólares' : ' en pesos')}
                  </p>
                  <p className="font-display text-3xl font-semibold">
                    {formatearMoneda(esCero(s.pendiente) ? s.total : s.pendiente, s.moneda)}
                  </p>
                  {!esCero(s.pagado) && !esCero(s.pendiente) && (
                    <p className="text-xs opacity-80">
                      Total {formatearMoneda(s.total, s.moneda)} · pagaste{' '}
                      {formatearMoneda(s.pagado, s.moneda)}
                    </p>
                  )}
                </div>
              ))
            )}

            <button
              type="button"
              onClick={() => setCorregirFechas(true)}
              className="flex items-center gap-1.5 text-xs font-medium underline-offset-4 opacity-90 hover:underline"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {r.fechasManuales
                ? 'Fechas corregidas a mano · cambiar'
                : '¿El banco cambió las fechas? Corregilas'}
            </button>
          </section>

          {r.saldos
            .filter((s) => !esCero(s.pendiente))
            .map((s) => (
              <Button key={s.moneda} size="lg" className="w-full" onClick={() => setPagar(s)}>
                <Wallet /> Registrar pago
                {r.saldos.length > 1 && (s.moneda === 'USD' ? ' en dólares' : ' en pesos')}
              </Button>
            ))}

          <section className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">
              Compras de este resumen
            </h2>
            {r.cuotas.length === 0 ? (
              <Vacio
                icono={Receipt}
                titulo={`Nada en el resumen de ${nombrePeriodo(r.periodo).toLowerCase()}`}
                texto="Las compras con esta tarjeta aparecen acá, en el resumen en que se pagan."
              />
            ) : (
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {r.cuotas.map((c) => (
                  <li key={`${c.compraId}-${c.numero}`}>
                    <button
                      type="button"
                      onClick={() =>
                        abrir({ modo: 'compra', existente: { tarjetaId: r.tarjeta.id, cuota: c } })
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent"
                    >
                      {c.categoria ? (
                        <IconoCategoria
                          icono={c.categoria.icono}
                          color={c.categoria.color}
                          tamano="sm"
                        />
                      ) : (
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"
                          aria-hidden
                        >
                          🧾
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{c.descripcion}</span>
                        <span className="block text-sm text-muted-foreground">
                          {c.cantidadCuotas > 1
                            ? `Cuota ${c.numero} de ${c.cantidadCuotas}`
                            : 'En un pago'}{' '}
                          · {fechaCorta(c.fechaCompra)}
                        </span>
                      </span>
                      <CurrencyAmount valor={c.monto} moneda={c.moneda} className="font-semibold" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {r.pagos.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-muted-foreground">Pagos</h2>
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {r.pagos.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">Desde {p.cuenta.nombre}</span>
                      <span className="block text-sm text-muted-foreground">
                        {fechaCorta(p.fecha)}
                      </span>
                    </span>
                    <CurrencyAmount
                      valor={p.monto}
                      moneda={p.moneda}
                      className="font-semibold text-success"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar pago"
                      onClick={() => setPagoABorrar(p)}
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <CierrePanel
            abierto={corregirFechas}
            onCerrar={() => setCorregirFechas(false)}
            resumen={r}
          />
          <PagoPanel
            abierto={pagar !== null}
            onCerrar={() => setPagar(null)}
            resumen={r}
            saldo={pagar}
            cuentas={cuentas.data ?? []}
          />
        </div>
      )}

      <Confirmacion
        abierta={pagoABorrar !== null}
        onAbiertaChange={(a) => !a && setPagoABorrar(null)}
        titulo="¿Eliminar este pago?"
        mensaje="La plata vuelve al saldo de la cuenta y el resumen queda otra vez pendiente."
        textoConfirmar="Eliminar"
        destructiva
        cargando={borrarPago.isPending}
        onConfirmar={() => void confirmarBorrarPago()}
      />
      {tarjeta && (
        <TarjetaPanel
          abierto={editarTarjeta}
          onCerrar={() => setEditarTarjeta(false)}
          tarjeta={tarjeta}
        />
      )}
    </Pagina>
  );
}
