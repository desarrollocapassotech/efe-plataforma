import type { Moneda } from '@efe/shared/dinero';
import { hoy, periodoDe } from '@efe/shared/fechas';
import { Plus, Receipt } from 'lucide-react';
import { useState } from 'react';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { MesNavigator } from '@/components/MesNavigator';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { NOMBRE_MONEDA } from '@/features/cuentas/tipos';
import { WidgetIndicadores } from '@/features/indicadores/components/WidgetIndicadores';
import { useCargaRapida } from '@/features/movimientos/carga-rapida-context';
import { Segmentado } from '@/features/movimientos/components/Selectores';
import { useMe } from '@/features/perfil/hooks';
import { nombrePeriodo } from '@/lib/fechas-ui';
import { cn } from '@/lib/utils';
import { Comparacion } from '../components/Comparacion';
import { Evolucion } from '../components/Evolucion';
import { GastosPorCategoria } from '../components/GastosPorCategoria';
import { ObjetivosInicio } from '../components/ObjetivosInicio';
import { ResumenDelMes } from '../components/ResumenDelMes';
import { TarjetasInicio } from '../components/TarjetasInicio';
import { useEvolucion, useResumenMensual } from '../hooks';

const MESES_EVOLUCION = 12;

/**
 * Inicio: pocas tarjetas y claras. Primero cuánto te queda (la respuesta que se busca al
 * abrir la app), después en qué se fue, la comparación con el mes anterior y la evolución.
 * Sin conversión entre monedas (decisión #2 de ARCHITECTURE §11): se elige cuál ver.
 */
export function InicioPage() {
  const { data: me } = useMe();
  const { abrir } = useCargaRapida();
  const mesActual = periodoDe(hoy());
  const [periodo, setPeriodo] = useState(mesActual);
  const [monedaElegida, setMonedaElegida] = useState<Moneda | null>(null);

  const resumen = useResumenMensual(periodo);
  const evolucion = useEvolucion(MESES_EVOLUCION, mesActual);

  const monedas = resumen.data?.monedas ?? [];
  const disponibles = monedas.map((m) => m.moneda);
  // Derivada (sin efectos): la elegida si tiene datos este mes, si no la principal o la primera.
  const moneda: Moneda | undefined =
    (monedaElegida && disponibles.includes(monedaElegida) ? monedaElegida : undefined) ??
    (me && disponibles.includes(me.monedaPrincipal) ? me.monedaPrincipal : disponibles[0]);
  const delMes = monedas.find((m) => m.moneda === moneda);
  const serie =
    evolucion.data?.monedas.find((m) => m.moneda === (moneda ?? me?.monedaPrincipal))?.meses ?? [];

  return (
    <Pagina titulo={me?.nombre ? `Hola, ${me.nombre}` : 'Hola'}>
      <MesNavigator periodo={periodo} onChange={setPeriodo} />

      {disponibles.length > 1 && moneda && (
        <Segmentado
          etiqueta="Moneda"
          opciones={disponibles.map((m) => ({ valor: m, nombre: NOMBRE_MONEDA[m] }))}
          valor={moneda}
          onChange={setMonedaElegida}
        />
      )}

      {resumen.isPending ? (
        <Cargando />
      ) : resumen.isError ? (
        <ErrorCarga mensaje={resumen.error.message} onReintentar={() => void resumen.refetch()} />
      ) : !delMes ? (
        <Vacio
          icono={Receipt}
          titulo={`No hay nada cargado en ${nombrePeriodo(periodo).toLowerCase()}`}
          texto="Cargá lo que gastás y lo que te entra, y acá vas a ver cuánto te queda."
          accion={
            <Button onClick={() => abrir({ modo: 'nuevo', tipo: 'GASTO' })}>
              <Plus /> Cargar
            </Button>
          }
        />
      ) : (
        <div
          className={cn('space-y-4 transition-opacity', resumen.isPlaceholderData && 'opacity-60')}
        >
          <ResumenDelMes resumen={delMes} />
          {delMes.porCategoria.length > 0 && (
            <GastosPorCategoria resumen={delMes} periodo={periodo} />
          )}
          <Comparacion resumen={delMes} periodo={periodo} />
        </div>
      )}

      {serie.some((m) => m.ingresos !== '0.00' || m.gastos !== '0.00') && moneda && (
        <Evolucion meses={serie} moneda={moneda} periodoElegido={periodo} onElegir={setPeriodo} />
      )}

      <TarjetasInicio moneda={moneda ?? me?.monedaPrincipal ?? 'ARS'} />

      <ObjetivosInicio />

      <WidgetIndicadores />
    </Pagina>
  );
}
