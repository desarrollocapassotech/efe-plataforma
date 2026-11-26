import { formatearMoneda } from '@efe/shared/dinero';
import type { Objetivo } from '@efe/shared/schemas';
import { CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { nombrePeriodo } from '@/lib/fechas-ui';
import { porcentajeRedondo } from '@/lib/formato';
import { cn } from '@/lib/utils';

/** Estado de un objetivo en palabras + ícono (nunca solo color). */
export function EstadoObjetivo({ objetivo: o }: { objetivo: Objetivo }) {
  if (o.estado === 'CUMPLIDO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Cumplido
      </span>
    );
  }
  if (o.estado === 'ARCHIVADO') {
    return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Archivado</span>;
  }
  return o.avance.enCamino ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
      <TrendingUp className="h-3.5 w-3.5" /> En camino
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-foreground">
      <Clock className="h-3.5 w-3.5 text-warning" />{' '}
      {o.fechaObjetivo ? 'Atrasado' : 'Sin aportes recientes'}
    </span>
  );
}

/** Barra de avance (dorada: el color de acento de EFE). */
export function BarraAvance({ porcentaje, className }: { porcentaje: string; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Number(porcentaje))}
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}
    >
      <div className="h-full rounded-full bg-gold" style={{ width: `${Number(porcentaje)}%` }} />
    </div>
  );
}

export function TarjetaObjetivo({
  objetivo: o,
  compacta,
}: {
  objetivo: Objetivo;
  compacta?: boolean;
}) {
  const a = o.avance;
  return (
    <Link
      to={`/objetivos/${o.id}`}
      className={cn(
        'block space-y-3 rounded-xl border bg-card px-4 py-4 transition hover:bg-accent',
        compacta && 'space-y-2 border-0 px-0 py-2 hover:bg-transparent',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/10 text-2xl"
          aria-hidden
        >
          {o.icono ?? '🎯'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{o.nombre}</span>
          <span className="block text-sm text-muted-foreground">
            {formatearMoneda(a.acumulado, o.moneda, { decimales: 0 })} de{' '}
            {formatearMoneda(o.montoObjetivo, o.moneda, { decimales: 0 })}
          </span>
        </span>
        <span className="text-lg font-semibold">{porcentajeRedondo(a.porcentaje)}</span>
      </div>
      <BarraAvance porcentaje={a.porcentaje} />
      {!compacta && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {o.estado !== 'ACTIVO'
              ? ''
              : a.aporteMensualSugerido
                ? `Aportá ${formatearMoneda(a.aporteMensualSugerido, o.moneda, { decimales: 0 })} por mes${
                    o.fechaObjetivo
                      ? ` hasta ${nombrePeriodo(o.fechaObjetivo.slice(0, 7)).toLowerCase()}`
                      : ''
                  }`
                : a.fechaEstimada
                  ? `A este ritmo llegás en ${nombrePeriodo(a.fechaEstimada.slice(0, 7)).toLowerCase()}`
                  : ''}
          </span>
          <EstadoObjetivo objetivo={o} />
        </div>
      )}
    </Link>
  );
}
