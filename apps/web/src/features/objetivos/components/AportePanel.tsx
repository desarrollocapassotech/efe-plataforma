import { esCero } from '@efe/shared/dinero';
import { hoy as hoyAR } from '@efe/shared/fechas';
import type { Objetivo } from '@efe/shared/schemas';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { MoneyInput } from '@/components/MoneyInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import {
  ErrorFormulario,
  Segmentado,
  SelectorFecha,
} from '@/features/movimientos/components/Selectores';
import { useCrearAporte } from '../hooks';

/** Sumar plata a un objetivo (o sacar: retiro). */
export function AportePanel({
  abierto,
  onCerrar,
  objetivo,
}: {
  abierto: boolean;
  onCerrar: () => void;
  objetivo: Objetivo;
}) {
  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && onCerrar()}
      titulo="Aportar"
      descripcion={objetivo.nombre}
    >
      {abierto && <Formulario objetivo={objetivo} onListo={onCerrar} />}
    </Panel>
  );
}

function Formulario({ objetivo, onListo }: { objetivo: Objetivo; onListo: () => void }) {
  const [tipo, setTipo] = useState<'APORTE' | 'RETIRO'>('APORTE');
  const [monto, setMonto] = useState(objetivo.avance.aporteMensualSugerido ?? '');
  const [fecha, setFecha] = useState(hoyAR());
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const crear = useCrearAporte();

  const guardar = async () => {
    setError(null);
    if (!monto || esCero(monto)) return setError('Poné cuánto.');
    try {
      await crear.mutateAsync({
        id: objetivo.id,
        datos: { monto: tipo === 'RETIRO' ? `-${monto}` : monto, fecha, nota: nota.trim() || null },
      });
      toast.success(tipo === 'RETIRO' ? 'Retiro registrado' : '¡Un pasito más! Aporte guardado');
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
      <Segmentado
        etiqueta="Tipo"
        opciones={[
          { valor: 'APORTE', nombre: 'Pongo plata' },
          { valor: 'RETIRO', nombre: 'Saco plata' },
        ]}
        valor={tipo}
        onChange={setTipo}
      />
      <div className="space-y-2">
        <Label htmlFor="aporte-monto" className="sr-only">
          Monto
        </Label>
        <MoneyInput
          id="aporte-monto"
          value={monto}
          onChange={setMonto}
          moneda={objetivo.moneda}
          tamano="grande"
          autoFocus
        />
      </div>
      <section className="space-y-2">
        <h3 className="text-sm font-medium">¿Cuándo?</h3>
        <SelectorFecha valor={fecha} onChange={setFecha} />
      </section>
      <div className="space-y-2">
        <Label htmlFor="aporte-nota">Nota (opcional)</Label>
        <Input
          id="aporte-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej. Aguinaldo"
          maxLength={200}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Es para seguir tu avance: no mueve plata de tus cuentas.
      </p>
      <ErrorFormulario mensaje={error} />
      <Button type="submit" size="lg" className="w-full" disabled={crear.isPending}>
        {crear.isPending && <Loader2 className="animate-spin" />}
        Guardar
      </Button>
    </form>
  );
}
