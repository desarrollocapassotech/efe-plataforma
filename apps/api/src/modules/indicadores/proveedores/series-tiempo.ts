import { periodoDe } from '@efe/shared/fechas';
import { valorIndicador } from '@efe/shared/indicadores';
import { z } from 'zod';
import type { ClienteHttp } from './cliente-http';
import { ErrorFuente, type ProveedorIndicadores, type ValorExterno } from './tipos';

/** IPC nacional, nivel general (INDEC, base dic-2016 = 100). */
export const SERIE_IPC = '148.3_INIVELNAL_DICI_M_26';
export const FUENTE_SERIES = 'INDEC vía datos.gob.ar';
export const urlSeriesIpc = (ultimos: number) =>
  `https://apis.datos.gob.ar/series/api/series/?ids=${SERIE_IPC}:percent_change&last=${ultimos}&format=json`;

const RespuestaSeries = z.object({
  data: z.array(z.tuple([z.string(), z.number().nullable()])),
});

/**
 * Inflación mensual de la API de Series de Tiempo: `percent_change` del índice devuelve la
 * variación contra el mes anterior como fracción (0.027) y la guardamos en % (2.7).
 */
export class ProveedorSeriesTiempo implements ProveedorIndicadores {
  readonly nombre = 'Series de Tiempo (datos.gob.ar)';

  constructor(
    private readonly http: ClienteHttp,
    private readonly ultimos = 13,
  ) {}

  async obtener(): Promise<ValorExterno[]> {
    const url = urlSeriesIpc(this.ultimos);
    const { data } = await this.http.obtenerJson(this.nombre, url, RespuestaSeries);
    const valores = data.flatMap(([fecha, fraccion]) =>
      fraccion === null
        ? []
        : [
            {
              codigo: 'IPC_MENSUAL' as const,
              fecha: `${periodoDe(fecha.slice(0, 10))}-01`,
              valor: valorIndicador(fraccion * 100),
              fuente: FUENTE_SERIES,
              urlFuente: url,
            },
          ],
    );
    if (valores.length === 0) throw new ErrorFuente(this.nombre, 'la serie del IPC vino vacía');
    return valores;
  }
}
