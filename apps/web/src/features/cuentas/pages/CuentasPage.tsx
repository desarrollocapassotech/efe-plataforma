import { MONEDAS, sumar, aString2Decimales, type Moneda } from '@efe/shared/dinero';
import type { Cuenta } from '@efe/shared/schemas';
import { ArrowLeftRight, ChevronDown, ChevronRight, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import { CurrencyAmount } from '@/components/CurrencyAmount';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { useCargaRapida } from '@/features/movimientos/carga-rapida-context';
import { useMe } from '@/features/perfil/hooks';
import { cn } from '@/lib/utils';
import { CuentaPanel } from '../components/CuentaPanel';
import { useCuentas } from '../hooks';
import { iconoDeCuenta, NOMBRE_MONEDA, nombreDeTipo } from '../tipos';

function totalesPorMoneda(cuentas: Cuenta[]): { moneda: Moneda; total: string }[] {
  return MONEDAS.flatMap((moneda) => {
    const deEsaMoneda = cuentas.filter((c) => c.moneda === moneda);
    if (deEsaMoneda.length === 0) return [];
    return [{ moneda, total: aString2Decimales(sumar(...deEsaMoneda.map((c) => c.saldoActual))) }];
  });
}

export function CuentasPage() {
  const cuentas = useCuentas();
  const { data: me } = useMe();
  const { abrir: abrirCarga } = useCargaRapida();
  const [panel, setPanel] = useState<{ abierto: boolean; cuenta: Cuenta | null }>({
    abierto: false,
    cuenta: null,
  });
  const [verArchivadas, setVerArchivadas] = useState(false);

  const abrir = (cuenta: Cuenta | null) => setPanel({ abierto: true, cuenta });
  const activas = cuentas.data?.filter((c) => !c.archivada) ?? [];
  const archivadas = cuentas.data?.filter((c) => c.archivada) ?? [];

  return (
    <Pagina titulo="Tus cuentas" volverA="/mas">
      {cuentas.isPending ? (
        <Cargando />
      ) : cuentas.isError ? (
        <ErrorCarga mensaje={cuentas.error.message} onReintentar={() => void cuentas.refetch()} />
      ) : activas.length === 0 && archivadas.length === 0 ? (
        <Vacio
          icono={Wallet}
          titulo="Todavía no tenés cuentas"
          texto="Una cuenta es donde tenés tu plata: efectivo, el banco, Mercado Pago…"
          accion={
            <Button onClick={() => abrir(null)}>
              <Plus /> Agregar cuenta
            </Button>
          }
        />
      ) : (
        <>
          {activas.length > 0 && (
            <section aria-label="Totales" className="grid gap-3 sm:grid-cols-2">
              {totalesPorMoneda(activas).map(({ moneda, total }) => (
                <div
                  key={moneda}
                  className="rounded-lg bg-primary px-5 py-4 text-primary-foreground"
                >
                  <p className="text-sm opacity-80">
                    Total en {NOMBRE_MONEDA[moneda].toLowerCase()}
                  </p>
                  <CurrencyAmount
                    valor={total}
                    moneda={moneda}
                    className="font-display text-3xl font-semibold"
                  />
                </div>
              ))}
            </section>
          )}

          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {activas.map((c) => (
              <li key={c.id}>
                <FilaCuenta cuenta={c} onClick={() => abrir(c)} />
              </li>
            ))}
          </ul>

          <Button className="w-full" size="lg" onClick={() => abrir(null)}>
            <Plus /> Agregar cuenta
          </Button>
          {activas.length > 1 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => abrirCarga({ modo: 'transferencia' })}
            >
              <ArrowLeftRight /> Pasar plata entre cuentas
            </Button>
          )}

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
                <ul className="mt-2 divide-y overflow-hidden rounded-lg border bg-card">
                  {archivadas.map((c) => (
                    <li key={c.id}>
                      <FilaCuenta cuenta={c} onClick={() => abrir(c)} apagada />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <CuentaPanel
        abierto={panel.abierto}
        cuenta={panel.cuenta}
        monedaPorDefecto={me?.monedaPrincipal}
        onCerrar={() => setPanel((p) => ({ ...p, abierto: false }))}
      />
    </Pagina>
  );
}

function FilaCuenta({
  cuenta,
  onClick,
  apagada,
}: {
  cuenta: Cuenta;
  onClick: () => void;
  apagada?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-accent',
        apagada && 'opacity-70',
      )}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-2xl"
        aria-hidden
      >
        {iconoDeCuenta(cuenta.tipo)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{cuenta.nombre}</span>
        <span className="block text-sm text-muted-foreground">
          {nombreDeTipo(cuenta.tipo)} · {NOMBRE_MONEDA[cuenta.moneda]}
        </span>
      </span>
      <CurrencyAmount
        valor={cuenta.saldoActual}
        moneda={cuenta.moneda}
        colorearNegativo
        className="font-semibold"
      />
    </button>
  );
}
