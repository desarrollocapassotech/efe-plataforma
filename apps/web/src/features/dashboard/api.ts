import type { Evolucion, ResumenMensual } from '@efe/shared/schemas';
import { api } from '@/lib/api';

export const obtenerResumenMensual = (periodo: string) =>
  api<ResumenMensual>(`/resumen/mensual?periodo=${periodo}`);

export const obtenerEvolucion = (meses: number, hasta: string) =>
  api<Evolucion>(`/resumen/evolucion?meses=${meses}&hasta=${hasta}`);
