import { formatearMoneda, type Moneda } from '@efe/shared/dinero';
import type { CompromisoPeriodo, TarjetaResumida } from '@efe/shared/schemas';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { nombrePeriodo, periodoCorto } from '@/lib/fechas-ui';
import { montoCompacto } from '@/lib/formato';

function token(nombre: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim();
  return valor ? `hsl(${valor})` : 'currentColor';
}

/** Color de la tarjeta (el que eligió el usuario) o el azul de gráficos si no tiene. */
export const colorDeTarjeta = (t: TarjetaResumida) => t.color ?? token('chart-ingresos');

interface GraficoCompromisosProps {
  periodos: CompromisoPeriodo[];
  tarjetas: TarjetaResumida[];
  moneda: Moneda;
  elegido: string | null;
  onElegir: (periodo: string) => void;
}

/**
 * Comprometido por mes, apilado por tarjeta (cada una con su color). Un solo eje.
 * Los montos se pasan a number solo para dibujar; el tooltip y la lista muestran los exactos.
 */
export default function GraficoCompromisos({
  periodos,
  tarjetas,
  moneda,
  elegido,
  onElegir,
}: GraficoCompromisosProps) {
  const datos = periodos.map((p) => {
    const fila: Record<string, number | string> = { periodo: p.periodo };
    for (const t of p.porTarjeta) if (t.moneda === moneda) fila[t.tarjeta.id] = Number(t.total);
    return fila;
  });
  const ejes = token('muted-foreground');
  const superficie = token('card');

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          onClick={(estado) => {
            if (typeof estado?.activeLabel === 'string') onElegir(estado.activeLabel);
          }}
        >
          <CartesianGrid vertical={false} stroke={token('border')} />
          <XAxis
            dataKey="periodo"
            tickLine={false}
            axisLine={false}
            interval={0}
            ticks={datos.filter((_, i) => i % 2 === 0).map((d) => d.periodo as string)}
            tick={({
              x,
              y,
              payload,
            }: {
              x?: number | string;
              y?: number | string;
              payload?: { value?: unknown };
            }) => (
              <text
                x={Number(x)}
                y={Number(y) + 12}
                textAnchor="middle"
                fontSize={11}
                fill={ejes}
                fontWeight={payload?.value === elegido ? 700 : 400}
              >
                {periodoCorto(String(payload?.value ?? ''))}
              </text>
            )}
          />
          <YAxis
            width={58}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: ejes }}
            tickFormatter={(v: number) => montoCompacto(v, moneda)}
          />
          <Tooltip
            cursor={{ fill: token('border'), opacity: 0.5 }}
            content={({ active, label }) => {
              const p = periodos.find((x) => x.periodo === label);
              if (!active || !p) return null;
              const filas = p.porTarjeta.filter((t) => t.moneda === moneda);
              if (filas.length === 0) return null;
              return (
                <div className="space-y-1 rounded-md border bg-card px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-muted-foreground">{nombrePeriodo(p.periodo)}</p>
                  {filas.map((f) => (
                    <p key={f.tarjeta.id} className="flex items-center gap-2">
                      <span
                        className="h-0.5 w-3 rounded-full"
                        style={{ backgroundColor: colorDeTarjeta(f.tarjeta) }}
                      />
                      <span className="font-semibold tabular-nums">
                        {formatearMoneda(f.total, moneda)}
                      </span>
                      <span className="text-muted-foreground">{f.tarjeta.nombre}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {tarjetas.map((t, i) => (
            <Bar
              key={t.id}
              dataKey={t.id}
              name={t.nombre}
              stackId="total"
              fill={colorDeTarjeta(t)}
              stroke={superficie}
              strokeWidth={1}
              maxBarSize={20}
              radius={i === tarjetas.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
