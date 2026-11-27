import { formatearMoneda } from '@efe/shared/dinero';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fechaCorta, nombrePeriodo } from '@/lib/fechas-ui';
import { formatearPorcentaje } from '../formato';
import { useIndicadores } from '../hooks';

/** Bloque compacto del inicio: MEP, oficial, brecha y última inflación. */
export function WidgetIndicadores() {
  const { data } = useIndicadores();
  if (!data || data.valores.length === 0) return null;
  const de = (codigo: string) => data.valores.find((v) => v.codigo === codigo);
  const mep = de('DOLAR_MEP_VENTA');
  const oficial = de('DOLAR_OFICIAL_VENTA');
  const ipc = de('IPC_MENSUAL');
  const filas = [
    mep && { nombre: 'Dólar MEP', valor: formatearMoneda(mep.valor, 'ARS', { decimales: 0 }) },
    oficial && {
      nombre: 'Dólar oficial',
      valor: formatearMoneda(oficial.valor, 'ARS', { decimales: 0 }),
    },
    data.brechaMep && { nombre: 'Brecha MEP', valor: formatearPorcentaje(data.brechaMep.valor, 0) },
    ipc && {
      nombre: `Inflación de ${nombrePeriodo(ipc.fecha.slice(0, 7)).toLowerCase()}`,
      valor: formatearPorcentaje(ipc.valor),
    },
  ].filter(Boolean) as { nombre: string; valor: string }[];

  return (
    <Link
      to="/indicadores"
      className="block space-y-2 rounded-xl border bg-card px-5 py-4 transition hover:bg-accent"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Dólar e inflación</h2>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
        {filas.map((f) => (
          <div key={f.nombre}>
            <dt className="text-xs text-muted-foreground">{f.nombre}</dt>
            <dd className="font-semibold">{f.valor}</dd>
          </div>
        ))}
      </dl>
      {(mep ?? oficial) && (
        <p className="text-xs text-muted-foreground">
          Dólar al {fechaCorta((mep ?? oficial)!.fecha)} · {(mep ?? oficial)!.fuente}
        </p>
      )}
    </Link>
  );
}
