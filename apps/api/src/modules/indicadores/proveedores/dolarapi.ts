import { hoy, ZONA_HORARIA_AR } from '@efe/shared/fechas';
import { esPrecioValido, valorIndicador, type CodigoIndicador } from '@efe/shared/indicadores';
import { z } from 'zod';
import type { ClienteHttp } from './cliente-http';
import { ErrorFuente, type ProveedorIndicadores, type ValorExterno } from './tipos';

export const URL_DOLARAPI = 'https://dolarapi.com/v1/dolares';
export const FUENTE_DOLARAPI = 'DolarApi (dolarhoy.com)';

const RespuestaDolarApi = z.array(
  z.object({
    casa: z.string(),
    compra: z.number().nullable(),
    venta: z.number().nullable(),
    fechaActualizacion: z.iso.datetime({ offset: true }),
  }),
);

/** Casa de DolarApi → prefijo de nuestros códigos. */
const CASAS: Record<string, 'OFICIAL' | 'MEP' | 'CCL'> = {
  oficial: 'OFICIAL',
  bolsa: 'MEP',
  contadoconliqui: 'CCL',
};

/**
 * Dólar oficial, MEP y CCL de DolarApi (una sola llamada trae todas las casas). La fecha
 * del dato es el día en Argentina de `fechaActualizacion`. Términos: citar la fuente y no
 * consultar más de una vez cada 3 horas (docs/fuentes-indicadores.md).
 */
export class ProveedorDolarApi implements ProveedorIndicadores {
  readonly nombre = 'DolarApi';

  constructor(private readonly http: ClienteHttp) {}

  async obtener(): Promise<ValorExterno[]> {
    const casas = await this.http.obtenerJson(this.nombre, URL_DOLARAPI, RespuestaDolarApi);
    const valores: ValorExterno[] = [];
    for (const c of casas) {
      const prefijo = CASAS[c.casa];
      if (!prefijo) continue;
      const fecha = hoy(ZONA_HORARIA_AR, new Date(c.fechaActualizacion));
      for (const [lado, numero] of [
        ['COMPRA', c.compra],
        ['VENTA', c.venta],
      ] as const) {
        if (numero === null) continue;
        const valor = valorIndicador(numero);
        if (!esPrecioValido(valor)) continue;
        valores.push({
          codigo: `DOLAR_${prefijo}_${lado}` as CodigoIndicador,
          fecha,
          valor,
          fuente: FUENTE_DOLARAPI,
          urlFuente: `${URL_DOLARAPI}/${c.casa}`,
        });
      }
    }
    if (!valores.some((v) => v.codigo === 'DOLAR_OFICIAL_VENTA')) {
      throw new ErrorFuente(this.nombre, 'la respuesta no trae el dólar oficial');
    }
    return valores;
  }
}
