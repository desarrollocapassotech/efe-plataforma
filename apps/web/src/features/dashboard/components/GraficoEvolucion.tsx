import { formatearMoneda, type Moneda } from '@efe/shared/dinero';
import type { PuntoEvolucion } from '@efe/shared/schemas';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { nombrePeriodo, periodoCorto } from '@/lib/fechas-ui';
import { montoCompacto } from '@/lib/formato';

/** Color de un token del preset (Recharts pinta SVG con atributos: no lee var()). */
function token(nombre: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim();
  return valor ? `hsl(${valor})` : 'currentColor';
}

interface GraficoEvolucionProps {
  meses: PuntoEvolucion[];
  moneda: Moneda;
  periodoElegido: string;
  onElegir: (periodo: string) => void;
}

/**
 * Entró vs gastaste por mes: barras agrupadas con un solo eje (mismas unidades).
 * Se carga aparte (lazy) para que Recharts no pese en la carga inicial de la app.
 * Los montos se pasan a number solo para dibujar; el tooltip muestra los exactos.
 */
export default function GraficoEvolucion({
  meses,
  moneda,
  periodoElegido,
  onElegir,
}: GraficoEvolucionProps) {
  const datos = meses.map((m) => ({
    periodo: m.periodo,
    ingresos: Number(m.ingresos),
    gastos: Number(m.gastos),
    original: m,
  }));
  const ejes = token('muted-foreground');
  const grilla = token('border');

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          barGap={2}
          barCategoryGap="20%"
          margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          onClick={(estado) => {
            if (typeof estado?.activeLabel === 'string') onElegir(estado.activeLabel);
          }}
        >
          <CartesianGrid vertical={false} stroke={grilla} strokeWidth={1} />
          <XAxis
            dataKey="periodo"
            tickLine={false}
            axisLine={false}
            interval={0}
            // Un mes sí y uno no, contando desde el último (que siempre se ve).
            ticks={datos.filter((_, i) => (datos.length - 1 - i) % 2 === 0).map((d) => d.periodo)}
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
                fontWeight={payload?.value === periodoElegido ? 700 : 400}
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
            cursor={{ fill: grilla, opacity: 0.5 }}
            content={(props) => (
              <Detalle active={props.active} payload={props.payload} moneda={moneda} />
            )}
          />
          <Bar
            dataKey="ingresos"
            name="Entró"
            fill={token('chart-ingresos')}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            isAnimationActive={false}
          />
          <Bar
            dataKey="gastos"
            name="Gastaste"
            fill={token('chart-gastos')}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type Dato = { periodo: string; original: PuntoEvolucion };

function Detalle({
  active,
  payload,
  moneda,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  moneda: Moneda;
}) {
  const dato = payload?.[0]?.payload as Dato | undefined;
  if (!active || !dato) return null;
  const filas = [
    { nombre: 'Entró', valor: dato.original.ingresos, color: token('chart-ingresos') },
    { nombre: 'Gastaste', valor: dato.original.gastos, color: token('chart-gastos') },
  ];
  return (
    <div className="space-y-1 rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-muted-foreground">{nombrePeriodo(dato.periodo)}</p>
      {filas.map((f) => (
        <p key={f.nombre} className="flex items-center gap-2">
          <span
            className="h-0.5 w-3 rounded-full"
            style={{ backgroundColor: f.color }}
            aria-hidden
          />
          <span className="font-semibold tabular-nums">{formatearMoneda(f.valor, moneda)}</span>
          <span className="text-muted-foreground">{f.nombre}</span>
        </p>
      ))}
    </div>
  );
}
