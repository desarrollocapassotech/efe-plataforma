import type { CodigoIndicador } from '@efe/shared/indicadores';
import type { Historico, Indicadores } from '@efe/shared/schemas';
import { api } from '@/lib/api';

// Públicos: funcionan con o sin sesión (el cliente agrega el token solo si hay usuario).
export const obtenerIndicadores = () => api<Indicadores>('/indicadores');

export const obtenerHistorico = (codigo: CodigoIndicador, desde: string, hasta: string) =>
  api<Historico>(`/indicadores/${codigo}/historico?desde=${desde}&hasta=${hasta}`);
