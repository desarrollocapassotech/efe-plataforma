import { comparar, esCero, formatearMoneda } from '@efe/shared/dinero';
import type { ResumenMoneda } from '@efe/shared/schemas';
import { AlertTriangle } from 'lucide-react';
import { porcentajeRedondo } from '@/lib/formato';
import { cn } from '@/lib/utils';

/**
 * La tarjeta principal del inicio: cuánto te queda este mes (la cifra protagonista),
 * cuánto entró y cuánto gastaste, y qué parte de lo que entró ya se fue.
 */
export function ResumenDelMes({ resumen }: { resumen: ResumenMoneda }) {
  const { moneda, ingresos, gastos, saldo, porcentajeGastado, gastosTarjeta } = resumen;
  const negativo = saldo.startsWith('-') && !esCero(saldo);
  const pct = porcentajeGastado;
  // Severidad del medidor: hasta 80 % normal, 80–100 % atención, más de 100 % pasado.
  const nivel =
    pct === null
      ? null
      : comparar(pct, 100) > 0
        ? 'pasado'
        : comparar(pct, 80) >= 0
          ? 'atencion'
          : 'normal';
  const ancho = pct === null ? 0 : Math.min(Number(pct), 100); // Solo para dibujar el ancho.

  return (
    <section
      aria-label="Resumen del mes"
      className="space-y-5 rounded-xl bg-primary px-5 py-5 text-primary-foreground"
    >
      <div className="space-y-1">
        <p className="text-sm opacity-80">
          {negativo ? 'Gastaste más de lo que entró' : 'Te queda este mes'}
        </p>
        <p className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
          {formatearMoneda(saldo, moneda, { decimales: 0 })}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-primary-foreground/10 px-3 py-2.5">
          <dt className="text-xs opacity-80">Entró</dt>
          <dd className="text-lg font-semibold">
            {formatearMoneda(ingresos, moneda, { decimales: 0 })}
          </dd>
        </div>
        <div className="rounded-lg bg-primary-foreground/10 px-3 py-2.5">
          <dt className="text-xs opacity-80">Gastaste</dt>
          <dd className="text-lg font-semibold">
            {formatearMoneda(gastos, moneda, { decimales: 0 })}
          </dd>
          {!esCero(gastosTarjeta) && (
            <dd className="text-xs opacity-80">
              {formatearMoneda(gastosTarjeta, moneda, { decimales: 0 })} con tarjeta
            </dd>
          )}
        </div>
      </dl>

      {pct === null ? (
        <p className="text-sm opacity-80">
          Cargá lo que te entró este mes para ver cuánto te queda.
        </p>
      ) : (
        <div className="space-y-2">
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ancho)}
            aria-label="Parte de lo que entró que ya gastaste"
            className="h-2 overflow-hidden rounded-full bg-primary-foreground/20"
          >
            <div
              className={cn(
                'h-full rounded-full',
                nivel === 'normal' && 'bg-gold-light',
                nivel === 'atencion' && 'bg-warning',
                nivel === 'pasado' && 'bg-destructive',
              )}
              style={{ width: `${ancho}%` }}
            />
          </div>
          <p className="flex items-center gap-1.5 text-sm">
            {nivel === 'pasado' && <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
            Gastaste el {porcentajeRedondo(pct)} de lo que entró
          </p>
        </div>
      )}
    </section>
  );
}
