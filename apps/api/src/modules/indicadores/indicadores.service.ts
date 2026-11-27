import { Injectable, Logger } from '@nestjs/common';
import { variacionPorcentual } from '@efe/shared/dinero';
import { hoy, sumarDias, sumarPeriodos, periodoDe } from '@efe/shared/fechas';
import {
  brecha,
  CODIGOS_INDICADOR,
  FUENTE_MANUAL,
  ipcAcumulado,
  type CodigoIndicador,
} from '@efe/shared/indicadores';
import type {
  CorregirIndicador,
  Historico,
  HistoricoQuery,
  IndicadorAdmin,
  Indicadores,
  ListarIndicadoresAdminQuery,
  ValorIndicador,
} from '@efe/shared/schemas';
import { Prisma, type Indicador } from '@prisma/client';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProveedorHistoricoDolaresArgentinaDatos,
  ProveedorInflacionArgentinaDatos,
} from './proveedores/argentina-datos';
import { ClienteHttp } from './proveedores/cliente-http';
import { ProveedorConRespaldo } from './proveedores/con-respaldo';
import { ProveedorDolarApi } from './proveedores/dolarapi';
import { ProveedorSeriesTiempo } from './proveedores/series-tiempo';
import type { ProveedorIndicadores, ValorExterno } from './proveedores/tipos';

/** Las consultas públicas se cachean 5 minutos (ARCHITECTURE §7). */
export const CACHE_MS = 5 * 60_000;

export interface ResultadoIngesta {
  proveedores: { nombre: string; ok: boolean; valores?: number; error?: string }[];
  creados: number;
  actualizados: number;
  /** Valores que no se pisaron porque tienen una corrección manual. */
  manualesConservados: number;
}

const dec = (v: Prisma.Decimal) => v.toString();

@Injectable()
export class IndicadoresService {
  private readonly logger = new Logger(IndicadoresService.name);
  private readonly cache = new Map<string, { hasta: number; valor: unknown }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: ClienteHttp,
  ) {}

  /** Proveedores del job diario/horario: dólares de DolarApi e IPC (INDEC, con respaldo). */
  proveedoresDelJob(): ProveedorIndicadores[] {
    return [
      new ProveedorDolarApi(this.http),
      new ProveedorConRespaldo(
        new ProveedorSeriesTiempo(this.http),
        new ProveedorInflacionArgentinaDatos(this.http, () => hoy()),
        (e) => this.reportarFalla(e),
      ),
    ];
  }

  /** Carga inicial: 90 días de dólares (ArgentinaDatos) y 24 meses de IPC. */
  proveedoresHistoricos(): ProveedorIndicadores[] {
    return [
      new ProveedorHistoricoDolaresArgentinaDatos(this.http, () => hoy(), 90),
      new ProveedorConRespaldo(
        new ProveedorSeriesTiempo(this.http, 25),
        new ProveedorInflacionArgentinaDatos(this.http, () => hoy(), 25),
        (e) => this.reportarFalla(e),
      ),
    ];
  }

  /**
   * Corre todos los proveedores en paralelo (si uno falla, los otros siguen), guarda por
   * (código, fecha) y loguea el resultado. Las fallas se reportan y se mantiene el último
   * valor guardado: el front muestra la fecha del dato.
   */
  async ingestar(proveedores = this.proveedoresDelJob()): Promise<ResultadoIngesta> {
    const resultados = await Promise.allSettled(proveedores.map((p) => p.obtener()));
    const resumen: ResultadoIngesta = {
      proveedores: [],
      creados: 0,
      actualizados: 0,
      manualesConservados: 0,
    };
    const valores: ValorExterno[] = [];
    resultados.forEach((r, i) => {
      const nombre = proveedores[i]!.nombre;
      if (r.status === 'fulfilled') {
        valores.push(...r.value);
        resumen.proveedores.push({ nombre, ok: true, valores: r.value.length });
      } else {
        this.reportarFalla(r.reason);
        const error = r.reason instanceof Error ? r.reason.message : String(r.reason);
        resumen.proveedores.push({ nombre, ok: false, error });
      }
    });
    const guardado = await this.guardar(valores);
    Object.assign(resumen, guardado);
    this.cache.clear();
    this.logger.log(resumen, 'Ingesta de indicadores');
    return resumen;
  }

  /**
   * Upsert por (código, fecha) sin pisar las correcciones manuales del admin: si un valor
   * fue corregido a mano, la fuente externa no lo reemplaza.
   */
  private async guardar(valores: ValorExterno[]) {
    const resultado = { creados: 0, actualizados: 0, manualesConservados: 0 };
    if (valores.length === 0) return resultado;
    // Si una fuente repite (código, fecha), vale el último (ej. varias cotizaciones del día).
    const unicos = new Map(valores.map((v) => [`${v.codigo}|${v.fecha}`, v]));
    const existentes = await this.prisma.indicador.findMany({
      where: {
        OR: [...unicos.values()].map((v) => ({ codigo: v.codigo, fecha: fechaADb(v.fecha) })),
      },
    });
    const porClave = new Map(existentes.map((e) => [`${e.codigo}|${fechaDeDb(e.fecha)}`, e]));

    const nuevos: Prisma.IndicadorCreateManyInput[] = [];
    const cambios: { id: string; v: ValorExterno }[] = [];
    for (const [clave, v] of unicos) {
      const actual = porClave.get(clave);
      if (!actual) {
        nuevos.push({ ...v, fecha: fechaADb(v.fecha) });
      } else if (actual.fuente === FUENTE_MANUAL) {
        resultado.manualesConservados++;
      } else if (!actual.valor.equals(v.valor) || actual.fuente !== v.fuente) {
        cambios.push({ id: actual.id, v });
      }
    }
    await this.prisma.$transaction([
      this.prisma.indicador.createMany({ data: nuevos, skipDuplicates: true }),
      ...cambios.map(({ id, v }) =>
        this.prisma.indicador.update({
          where: { id },
          data: {
            valor: v.valor,
            fuente: v.fuente,
            urlFuente: v.urlFuente,
            obtenidoEn: new Date(),
          },
        }),
      ),
    ]);
    resultado.creados = nuevos.length;
    resultado.actualizados = cambios.length;
    return resultado;
  }

  /** Último valor de cada indicador + brechas + IPC acumulado del año (público, cacheado). */
  async resumen(): Promise<Indicadores> {
    return this.cacheado('resumen', async () => {
      // Los dos últimos valores de cada código, con una sola consulta (ventana en SQL).
      const filas = await this.prisma.$queryRaw<Indicador[]>(Prisma.sql`
        SELECT id, codigo, fecha, valor, fuente, "urlFuente", "obtenidoEn"
        FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY codigo ORDER BY fecha DESC) AS n
          FROM indicadores
        ) t
        WHERE n <= 2
      `);
      const valores: ValorIndicador[] = CODIGOS_INDICADOR.flatMap((codigo) => {
        const [ultimo, anterior] = filas
          .filter((f) => f.codigo === codigo)
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
        if (!ultimo) return [];
        return [
          {
            codigo,
            fecha: fechaDeDb(ultimo.fecha),
            valor: dec(ultimo.valor),
            fuente: ultimo.fuente,
            urlFuente: ultimo.urlFuente,
            obtenidoEn: ultimo.obtenidoEn.toISOString(),
            anterior: anterior
              ? { fecha: fechaDeDb(anterior.fecha), valor: dec(anterior.valor) }
              : null,
            variacion: anterior
              ? variacionPorcentual(ultimo.valor.toString(), anterior.valor.toString())
              : null,
          },
        ];
      });

      const de = (c: CodigoIndicador) => valores.find((v) => v.codigo === c);
      const oficial = de('DOLAR_OFICIAL_VENTA');
      const calcularBrecha = (c: CodigoIndicador) => {
        const dolar = de(c);
        if (!oficial || !dolar) return null;
        const valor = brecha(dolar.valor, oficial.valor);
        // La fecha de la brecha es la del dato más viejo de los dos.
        const fecha = dolar.fecha < oficial.fecha ? dolar.fecha : oficial.fecha;
        return valor === null ? null : { valor, fecha };
      };

      const ipc = de('IPC_MENSUAL');
      let ipcAcumuladoAnio: Indicadores['ipcAcumuladoAnio'] = null;
      if (ipc) {
        const anio = ipc.fecha.slice(0, 4);
        const delAnio = await this.prisma.indicador.findMany({
          where: {
            codigo: 'IPC_MENSUAL',
            fecha: { gte: fechaADb(`${anio}-01-01`), lte: fechaADb(ipc.fecha) },
          },
          select: { valor: true },
        });
        ipcAcumuladoAnio = {
          valor: ipcAcumulado(delAnio.map((f) => f.valor.toString())),
          fecha: ipc.fecha,
          meses: delAnio.length,
        };
      }

      return {
        valores,
        brechaMep: calcularBrecha('DOLAR_MEP_VENTA'),
        brechaCcl: calcularBrecha('DOLAR_CCL_VENTA'),
        ipcAcumuladoAnio,
      };
    });
  }

  /** Serie de un indicador. Sin rango: 90 días (IPC: 24 meses) hasta hoy. */
  async historico(codigo: CodigoIndicador, q: HistoricoQuery): Promise<Historico> {
    const hasta = q.hasta ?? hoy();
    const desde =
      q.desde ??
      (codigo === 'IPC_MENSUAL'
        ? `${sumarPeriodos(periodoDe(hasta), -23)}-01`
        : sumarDias(hasta, -90));
    return this.cacheado(`historico|${codigo}|${desde}|${hasta}`, async () => {
      const filas = await this.prisma.indicador.findMany({
        where: { codigo, fecha: { gte: fechaADb(desde), lte: fechaADb(hasta) } },
        orderBy: { fecha: 'asc' },
      });
      return {
        codigo,
        puntos: filas.map((f) => ({
          fecha: fechaDeDb(f.fecha),
          valor: dec(f.valor),
          fuente: f.fuente,
        })),
      };
    });
  }

  // --- Admin -------------------------------------------------------------------------

  async listarAdmin(q: ListarIndicadoresAdminQuery): Promise<IndicadorAdmin[]> {
    const filas = await this.prisma.indicador.findMany({
      where: {
        ...(q.codigo ? { codigo: q.codigo } : {}),
        ...(q.desde || q.hasta
          ? {
              fecha: {
                ...(q.desde ? { gte: fechaADb(q.desde) } : {}),
                ...(q.hasta ? { lte: fechaADb(q.hasta) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ fecha: 'desc' }, { codigo: 'asc' }],
      take: 500,
    });
    return filas.map((f) => this.aAdmin(f));
  }

  /** Corrección manual (queda con fuente "Carga manual EFE" y en la auditoría). */
  async corregir(actorId: string, datos: CorregirIndicador, ip?: string): Promise<IndicadorAdmin> {
    const fecha = fechaADb(datos.fecha);
    const indicador = await this.prisma.$transaction(async (tx) => {
      const anterior = await tx.indicador.findUnique({
        where: { codigo_fecha: { codigo: datos.codigo, fecha } },
      });
      const guardado = await tx.indicador.upsert({
        where: { codigo_fecha: { codigo: datos.codigo, fecha } },
        create: { codigo: datos.codigo, fecha, valor: datos.valor, fuente: FUENTE_MANUAL },
        update: {
          valor: datos.valor,
          fuente: FUENTE_MANUAL,
          urlFuente: null,
          obtenidoEn: new Date(),
        },
      });
      await tx.auditoria.create({
        data: {
          actorId,
          accion: 'admin.corregir_indicador',
          entidad: 'Indicador',
          entidadId: guardado.id,
          datos: {
            codigo: datos.codigo,
            fecha: datos.fecha,
            anterior: anterior ? { valor: dec(anterior.valor), fuente: anterior.fuente } : null,
            nuevo: datos.valor,
          },
          ip: ip ?? null,
        },
      });
      return guardado;
    });
    this.cache.clear();
    return this.aAdmin(indicador);
  }

  private aAdmin(f: Indicador): IndicadorAdmin {
    return {
      id: f.id,
      codigo: f.codigo as CodigoIndicador,
      fecha: fechaDeDb(f.fecha),
      valor: dec(f.valor),
      fuente: f.fuente,
      urlFuente: f.urlFuente,
      obtenidoEn: f.obtenidoEn.toISOString(),
    };
  }

  private async cacheado<T>(clave: string, calcular: () => Promise<T>): Promise<T> {
    const guardado = this.cache.get(clave);
    if (guardado && guardado.hasta > Date.now()) return guardado.valor as T;
    const valor = await calcular();
    this.cache.set(clave, { hasta: Date.now() + CACHE_MS, valor });
    return valor;
  }

  /** Sin Sentry configurado todavía (paso 8.2): las fallas van al logger como error. */
  private reportarFalla(error: unknown) {
    this.logger.error(
      `Fuente de indicadores con falla: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
