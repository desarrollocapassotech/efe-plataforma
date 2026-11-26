import { esCero } from '@efe/shared/dinero';
import { hoy as hoyAR } from '@efe/shared/fechas';
import type { Cuenta, ResumenTarjeta, SaldoResumen } from '@efe/shared/schemas';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import {
  ErrorFormulario,
  SelectorCuenta,
  SelectorFecha,
} from '@/features/movimientos/components/Selectores';
import { nombrePeriodo } from '@/lib/fechas-ui';
import { useCrearPago } from '../hooks';

interface PagoPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  resumen: ResumenTarjeta;
  saldo: SaldoResumen | null;
  cuentas: Cuenta[];
}

/** Registrar el pago de un resumen: de qué cuenta salió y cuánto (por defecto, lo que falta). */
export function PagoPanel({ abierto, onCerrar, resumen, saldo, cuentas }: PagoPanelProps) {
  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && onCerrar()}
      titulo="Registrar pago"
      descripcion={`Resumen de ${nombrePeriodo(resumen.periodo).toLowerCase()}${
        saldo?.moneda === 'USD' ? ' (dólares)' : ''
      }`}
    >
      {abierto && saldo && (
        <Formulario resumen={resumen} saldo={saldo} cuentas={cuentas} onListo={onCerrar} />
      )}
    </Panel>
  );
}

function Formulario({
  resumen,
  saldo,
  cuentas,
  onListo,
}: {
  resumen: ResumenTarjeta;
  saldo: SaldoResumen;
  cuentas: Cuenta[];
  onListo: () => void;
}) {
  const deLaMoneda = cuentas.filter((c) => !c.archivada && c.moneda === saldo.moneda);
  const [cuentaId, setCuentaId] = useState<string | null>(deLaMoneda[0]?.id ?? null);
  const [monto, setMonto] = useState(esCero(saldo.pendiente) ? '' : saldo.pendiente);
  const [fecha, setFecha] = useState(hoyAR());
  const [error, setError] = useState<string | null>(null);
  const crear = useCrearPago();

  if (deLaMoneda.length === 0) {
    return (
      <div className="space-y-4 py-2 text-center">
        <p className="text-sm text-muted-foreground">
          No tenés cuentas en {saldo.moneda === 'USD' ? 'dólares' : 'pesos'} para registrar el pago.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/mas/cuentas">Ir a cuentas</Link>
        </Button>
      </div>
    );
  }

  const guardar = async () => {
    setError(null);
    if (!cuentaId) return setError('Elegí de qué cuenta pagaste.');
    if (!monto || esCero(monto)) return setError('Poné cuánto pagaste.');
    try {
      await crear.mutateAsync({
        tarjetaId: resumen.tarjeta.id,
        cuentaId,
        periodo: resumen.periodo,
        monto,
        moneda: saldo.moneda,
        fecha,
      });
      toast.success('Pago registrado');
      onListo();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="pago-monto">¿Cuánto pagaste?</Label>
        <MoneyInput
          id="pago-monto"
          value={monto}
          onChange={setMonto}
          moneda={saldo.moneda}
          tamano="grande"
        />
      </div>
      {deLaMoneda.length > 1 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">¿De qué cuenta salió?</h3>
          <SelectorCuenta cuentas={deLaMoneda} valor={cuentaId} onChange={setCuentaId} />
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿Cuándo?</h3>
        <SelectorFecha valor={fecha} onChange={setFecha} />
      </section>
      <p className="text-xs text-muted-foreground">
        El pago descuenta la plata de la cuenta. No se cuenta como gasto: los gastos ya son las
        compras.
      </p>
      <ErrorFormulario mensaje={error} />
      <Button type="submit" size="lg" className="w-full" disabled={crear.isPending}>
        {crear.isPending && <Loader2 className="animate-spin" />}
        Registrar pago
      </Button>
    </form>
  );
}
