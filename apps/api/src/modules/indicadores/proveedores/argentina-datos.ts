import { periodoDe, sumarDias, sumarPeriodos } from '@efe/shared/fechas';
import { esPrecioValido, valorIndicador, type CodigoIndicador } from '@efe/shared/indicadores';
import { z } from 'zod';
import type { ClienteHttp } from './cliente-http';
import { ErrorFuente, type ProveedorIndicadores, type ValorExterno } from './tipos';

const BASE = 'https://api.argentinadatos.com/v1';
export const URL_INFLACION_AD = `${BASE}/finanzas/indices/inflacion`;
export const FUENTE_ARGENTINA_DATOS = 'ArgentinaDatos';

const RespuestaInflacion = z.array(z.object({ fecha: z.string(), valor: z.number() }));
const RespuestaCotizaciones = z.array(
  z.object({ fecha: z.string(), compra: z.number().nullable(), venta: z.number().nullable() }),
);

/** Inflación mensual de ArgentinaDatos (ya viene en %). Respaldo de Series de Tiempo. */
export class ProveedorInflacionArgentinaDatos implements ProveedorIndicadores {
  readonly nombre = 'ArgentinaDatos (IPC)';

  constructor(
    private readonly http: ClienteHttp,
    private readonly hoy: () => string,
    private readonly meses = 13,
  ) {}

  async obtener(): Promise<ValorExterno[]> {
    const filas = await this.http.obtenerJson(this.nombre, URL_INFLACION_AD, RespuestaInflacion);
    const desde = sumarPeriodos(periodoDe(this.hoy()), -this.meses);
    const valores = filas
      .map((f) => ({ ...f, periodo: periodoDe(f.fecha.slice(0, 10)) }))
      .filter((f) => f.periodo >= desde)
      .map((f) => ({
        codigo: 'IPC_MENSUAL' as const,
        fecha: `${f.periodo}-01`,
        valor: valorIndicador(f.valor),
        fuente: FUENTE_ARGENTINA_DATOS,
        urlFuente: URL_INFLACION_AD,
      }));
    if (valores.length === 0) throw new ErrorFuente(this.nombre, 'la inflación vino vacía');
    return valores;
  }
}

const CASAS = { oficial: 'OFICIAL', bolsa: 'MEP', contadoconliqui: 'CCL' } as const;

/** Histórico de dólares (para la carga inicial): los últimos `dias` días de cada casa. */
export class ProveedorHistoricoDolaresArgentinaDatos implements ProveedorIndicadores {
  readonly nombre = 'ArgentinaDatos (dólares)';

  constructor(
    private readonly http: ClienteHttp,
    private readonly hoy: () => string,
    private readonly dias: number,
  ) {}

  async obtener(): Promise<ValorExterno[]> {
    const desde = sumarDias(this.hoy(), -this.dias);
    const valores: ValorExterno[] = [];
    for (const [casa, prefijo] of Object.entries(CASAS)) {
      const url = `${BASE}/cotizaciones/dolares/${casa}`;
      const filas = await this.http.obtenerJson(this.nombre, url, RespuestaCotizaciones);
      for (const f of filas) {
        const fecha = f.fecha.slice(0, 10);
        if (fecha < desde) continue;
        for (const [lado, numero] of [
          ['COMPRA', f.compra],
          ['VENTA', f.venta],
        ] as const) {
          if (numero === null || !esPrecioValido(valorIndicador(numero))) continue;
          valores.push({
            codigo: `DOLAR_${prefijo}_${lado}` as CodigoIndicador,
            fecha,
            valor: valorIndicador(numero),
            fuente: FUENTE_ARGENTINA_DATOS,
            urlFuente: url,
          });
        }
      }
    }
    return valores;
  }
}
