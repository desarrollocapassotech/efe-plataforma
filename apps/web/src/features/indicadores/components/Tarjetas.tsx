import { comparar, formatearMoneda } from '@efe/shared/dinero';
import type { CodigoIndicador } from '@efe/shared/indicadores';
import type { Indicadores, ValorIndicador } from '@efe/shared/schemas';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { fechaCorta, nombrePeriodo } from '@/lib/fechas-ui';
import { formatearPorcentaje } from '../formato';
import { useHistorico } from '../hooks';
import { Sparkline } from './Sparkline';

/** Fecha del dato + fuente: el producto exige que siempre estén a la vista. */
export function Procedencia({ valor, mensual }: { valor: ValorIndicador; mensual?: boolean }) {
  return (
    <p className="text-xs text-muted-foreground">
      {mensual
        ? `Dato de ${nombrePeriodo(valor.fecha.slice(0, 7)).toLowerCase()}`
        : `Dato del ${fechaCorta(valor.fecha)}`}{' '}
      · Fuente:{' '}
      {valor.urlFuente ? (
        <a
          href={valor.urlFuente}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          {valor.fuente}
        </a>
      ) : (
        valor.fuente
      )}
    </p>
  );
}

/** Variación con flecha (sin rojo/verde: que el dólar suba no es bueno ni malo para todos). */
export function Variacion({ variacion, contra }: { variacion: string | null; contra: string }) {
  if (variacion === null) return null;
  const sentido = comparar(variacion, 0);
  const Icono = sentido > 0 ? ArrowUpRight : sentido < 0 ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Icono className="h-3.5 w-3.5" aria-hidden />
      {formatearPorcentaje(variacion, 1, true)} {contra}
    </span>
  );
}

const NOMBRES = { OFICIAL: 'Dólar oficial', MEP: 'Dólar MEP', CCL: 'Dólar CCL' } as const;
const AYUDA = {
  OFICIAL: 'El del banco (Banco Nación)',
  MEP: 'Comprando bonos en pesos y vendiéndolos en dólares',
  CCL: 'El que usan las empresas para sacar dólares afuera',
} as const;

export function TarjetaDolar({
  tipo,
  datos,
}: {
  tipo: 'OFICIAL' | 'MEP' | 'CCL';
  datos: Indicadores;
}) {
  const venta = datos.valores.find((v) => v.codigo === `DOLAR_${tipo}_VENTA`);
  const compra = datos.valores.find((v) => v.codigo === `DOLAR_${tipo}_COMPRA`);
  const historico = useHistorico(`DOLAR_${tipo}_VENTA` as CodigoIndicador);
  const brecha = tipo === 'MEP' ? datos.brechaMep : tipo === 'CCL' ? datos.brechaCcl : null;

  return (
    <section aria-label={NOMBRES[tipo]} className="space-y-3 rounded-xl border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{NOMBRES[tipo]}</h2>
          <p className="text-xs text-muted-foreground">{AYUDA[tipo]}</p>
        </div>
        {brecha && (
          <span className="shrink-0 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium">
            Brecha {formatearPorcentaje(brecha.valor, 0)}
          </span>
        )}
      </div>
      {venta ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Venta</p>
              <p className="font-display text-3xl font-semibold">
                {formatearMoneda(venta.valor, 'ARS')}
              </p>
              <Variacion variacion={venta.variacion} contra="vs. día anterior" />
            </div>
            {compra && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Compra</p>
                <p className="text-lg font-medium">{formatearMoneda(compra.valor, 'ARS')}</p>
              </div>
            )}
          </div>
          <Sparkline valores={historico.data?.puntos.map((p) => p.valor) ?? []} />
          <Procedencia valor={venta} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no tenemos este dato.</p>
      )}
    </section>
  );
}

export function TarjetaInflacion({ datos }: { datos: Indicadores }) {
  const ipc = datos.valores.find((v) => v.codigo === 'IPC_MENSUAL');
  const historico = useHistorico('IPC_MENSUAL');
  const acumulado = datos.ipcAcumuladoAnio;
  return (
    <section aria-label="Inflación" className="space-y-3 rounded-xl border bg-card px-5 py-4">
      <div>
        <h2 className="font-semibold">Inflación</h2>
        <p className="text-xs text-muted-foreground">Cuánto subieron los precios (IPC del INDEC)</p>
      </div>
      {ipc ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                En {nombrePeriodo(ipc.fecha.slice(0, 7)).toLowerCase()}
              </p>
              <p className="font-display text-3xl font-semibold">
                {formatearPorcentaje(ipc.valor)}
              </p>
              {ipc.anterior && (
                <p className="text-xs text-muted-foreground">
                  El mes anterior: {formatearPorcentaje(ipc.anterior.valor)}
                </p>
              )}
            </div>
            {acumulado && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">En el año ({acumulado.meses} meses)</p>
                <p className="text-lg font-medium">{formatearPorcentaje(acumulado.valor)}</p>
              </div>
            )}
          </div>
          <Sparkline valores={historico.data?.puntos.map((p) => p.valor) ?? []} />
          <Procedencia valor={ipc} mensual />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Todavía no tenemos este dato.</p>
      )}
    </section>
  );
}
