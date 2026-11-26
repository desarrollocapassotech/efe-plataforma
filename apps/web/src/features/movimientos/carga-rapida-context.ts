import type { Movimiento, TipoMovimiento, Transferencia } from '@efe/shared/schemas';
import { createContext, useContext } from 'react';

/** Qué abrir en el panel de carga. */
export type PedidoCarga =
  | { modo: 'nuevo'; tipo: TipoMovimiento }
  | { modo: 'editar'; movimiento: Movimiento }
  | { modo: 'transferencia'; transferencia?: Transferencia };

export interface CargaRapida {
  abrir: (pedido: PedidoCarga) => void;
}

export const CargaRapidaContext = createContext<CargaRapida | null>(null);

/** Abre el panel de carga desde cualquier pantalla de la zona privada. */
export function useCargaRapida(): CargaRapida {
  const contexto = useContext(CargaRapidaContext);
  if (!contexto) throw new Error('useCargaRapida necesita CargaRapidaProvider');
  return contexto;
}
