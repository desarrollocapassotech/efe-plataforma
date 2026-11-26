import { aString2Decimales, esCero, formatearMoneda, sumar, type Moneda } from '@efe/shared/dinero';
import { ChevronRight, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IconoTarjeta } from '@/features/tarjetas/components/IconoTarjeta';
import { useCompromisos, useTarjetas } from '@/features/tarjetas/hooks';
import { nombreDia } from '@/lib/fechas-ui';

/** Próximo resumen a pagar y lo comprometido en cuotas en los próximos 3 meses. */
export function TarjetasInicio({ moneda }: { moneda: Moneda }) {
  const tarjetas = useTarjetas();
  const activas = tarjetas.data?.filter((t) => !t.archivada) ?? [];
  const compromisos = useCompromisos(3, activas.length > 0);

  if (tarjetas.isPending) return null;
  if (activas.length === 0) {
    return (
      <Link
        to="/tarjetas"
        className="flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 transition hover:bg-accent"
      >
        <CreditCard className="h-5 w-5 text-muted-foreground" />
        <span className="flex-1">
          <span className="block text-sm font-medium">¿Usás tarjeta de crédito?</span>
          <span className="block text-xs text-muted-foreground">
            Agregala y te decimos cuánto vas a pagar en cada resumen.
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }

  const proxima = activas
    .map((t) => ({ t, saldo: t.proximoResumen.saldos.find((s) => s.moneda === moneda) }))
    .filter((x) => x.saldo && !esCero(x.saldo.pendiente))
    .sort((a, b) =>
      a.t.proximoResumen.fechaVencimiento < b.t.proximoResumen.fechaVencimiento ? -1 : 1,
    )[0];
  const comprometido = aString2Decimales(
    sumar(
      0,
      ...(compromisos.data?.periodos ?? []).flatMap((p) =>
        p.totales.filter((x) => x.moneda === moneda).map((x) => x.total),
      ),
    ),
  );

  return (
    <section aria-label="Tarjetas" className="space-y-3 rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Tarjetas</h2>
        <Link to="/tarjetas" className="text-sm font-medium text-primary hover:underline">
          Ver todas
        </Link>
      </div>
      {proxima?.saldo ? (
        <Link
          to={`/tarjetas/${proxima.t.id}`}
          className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-accent"
        >
          <IconoTarjeta tarjeta={proxima.t} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">
              Próximo resumen · vence el{' '}
              {nombreDia(proxima.t.proximoResumen.fechaVencimiento).toLowerCase()}
            </span>
            <span className="block truncate text-sm font-medium">{proxima.t.nombre}</span>
          </span>
          <span className="font-semibold">
            {formatearMoneda(proxima.saldo.pendiente, moneda, { decimales: 0 })}
          </span>
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">No tenés resúmenes por pagar.</p>
      )}
      <Link
        to="/tarjetas/comprometido"
        className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2 text-sm transition hover:bg-accent"
      >
        <span className="text-muted-foreground">Comprometido en los próximos 3 meses</span>
        <span className="font-semibold">
          {formatearMoneda(comprometido, moneda, { decimales: 0 })}
        </span>
      </Link>
    </section>
  );
}
