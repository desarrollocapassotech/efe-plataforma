import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Metricas } from '@efe/shared/schemas';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EstadoListado, fechaCorta } from '@/components/plataforma/comunes';
import { apiEfe } from '@/lib/api-efe';

/** Color de un token del preset (Recharts pinta SVG con atributos: no lee var()). */
const token = (nombre: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim();
  return v ? `hsl(${v})` : 'currentColor';
};

const Cifra = ({
  label,
  valor,
  detalle,
}: {
  label: string;
  valor: string | number;
  detalle?: string;
}) => (
  <div className="space-y-1 bg-card p-4">
    <p className="eyebrow">{label}</p>
    <p className="font-display text-3xl font-semibold tabular-nums text-primary">{valor}</p>
    {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
  </div>
);

/**
 * Serie diaria de 30 días: barras de una sola serie (el título dice qué es; sin leyenda),
 * tooltip con el valor y la tabla con los números debajo.
 */
const SerieDiaria = ({
  titulo,
  puntos,
}: {
  titulo: string;
  puntos: Metricas['registrosPorDia'];
}) => {
  const total = puntos.reduce((acc, p) => acc + p.cantidad, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {titulo}{' '}
          <span className="font-sans text-sm font-normal text-muted-foreground">
            · {total} en 30 días
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-48" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={puntos} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={token('border')} />
              <XAxis
                dataKey="fecha"
                tickLine={false}
                axisLine={false}
                interval={6}
                tick={{ fontSize: 11, fill: token('muted-foreground') }}
                tickFormatter={(f: string) => fechaCorta(f).slice(0, 5)}
              />
              <YAxis
                width={32}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: token('muted-foreground') }}
              />
              <Tooltip
                cursor={{ fill: token('border'), opacity: 0.5 }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as
                    { fecha: string; cantidad: number } | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="border border-border bg-card px-3 py-2 text-xs">
                      <p className="text-muted-foreground">{fechaCorta(p.fecha)}</p>
                      <p className="font-semibold tabular-nums">{p.cantidad}</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="cantidad"
                fill={token('chart-ingresos')}
                radius={[2, 2, 0, 0]}
                maxBarSize={14}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver los números
          </summary>
          <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 tabular-nums sm:grid-cols-5">
            {puntos.map((p) => (
              <span key={p.fecha} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{fechaCorta(p.fecha).slice(0, 5)}</span>
                {p.cantidad}
              </span>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

/** Métricas de uso de la plataforma (sin administradores ni cuentas dadas de baja). */
export const Metrics = () => {
  const metricas = useQuery({
    queryKey: ['admin', 'metricas'],
    queryFn: () => apiEfe<Metricas>('/admin/metricas'),
  });
  const m = metricas.data;
  const pct = (n: number) =>
    m && m.totalUsuarios > 0 ? `${Math.round((n / m.totalUsuarios) * 100)} % del total` : undefined;

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Métricas' }]}
        title="Métricas de la plataforma"
        description="Usuarios de la app web, sin administradores ni cuentas dadas de baja."
      />
      <EstadoListado
        cargando={metricas.isPending}
        error={metricas.error}
        vacio={false}
        textoVacio=""
        onReintentar={() => void metricas.refetch()}
      >
        {m && (
          <>
            <section
              aria-label="Usuarios"
              className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-5"
            >
              <Cifra label="Usuarios" valor={m.totalUsuarios} />
              <Cifra label="Activos 7 días" valor={m.activos7} detalle={pct(m.activos7)} />
              <Cifra label="Activos 30 días" valor={m.activos30} detalle={pct(m.activos30)} />
              <Cifra
                label="Cargaron algo"
                valor={m.conMovimientos}
                detalle="Al menos un movimiento"
              />
              <Cifra
                label="Onboarding"
                valor={
                  m.onboardingCompletado === null
                    ? '—'
                    : `${Math.round(Number(m.onboardingCompletado))} %`
                }
                detalle="Lo completaron"
              />
            </section>
            <div className="grid gap-4 lg:grid-cols-2">
              <SerieDiaria titulo="Registros por día" puntos={m.registrosPorDia} />
              <SerieDiaria titulo="Movimientos cargados por día" puntos={m.movimientosPorDia} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uso por módulo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
                  <Cifra
                    label="Con tarjetas"
                    valor={m.usoModulos.conTarjetas}
                    detalle={pct(m.usoModulos.conTarjetas)}
                  />
                  <Cifra
                    label="Con objetivos"
                    valor={m.usoModulos.conObjetivos}
                    detalle={pct(m.usoModulos.conObjetivos)}
                  />
                  <Cifra
                    label="Con recurrentes"
                    valor={m.usoModulos.conRecurrencias}
                    detalle={pct(m.usoModulos.conRecurrencias)}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </EstadoListado>
    </div>
  );
};
