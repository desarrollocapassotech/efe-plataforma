import { Injectable, Logger } from '@nestjs/common';
import { aString2Decimales } from '@efe/shared/dinero';
import { type Fecha, hoy, sumarDias } from '@efe/shared/fechas';
import {
  ocurrenciasRecurrencia,
  proximaOcurrencia,
  type ReglaRecurrencia,
} from '@efe/shared/recurrencias';
import type {
  ActualizarRecurrencia,
  CrearRecurrencia,
  ListarRecurrenciasQuery,
  Recurrencia,
} from '@efe/shared/schemas';
import { Prisma, type Recurrencia as RecurrenciaDb } from '@prisma/client';
import { noEncontrado, noProcesable } from '../../common/errors/errores';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriasService, exigirCategoriaValida } from '../categorias/categorias.service';
import { CuentasService, exigirCuentaActiva } from '../cuentas/cuentas.service';

const INCLUIR = {
  cuenta: { select: { id: true, nombre: true, tipo: true, moneda: true } },
  categoria: { select: { id: true, nombre: true, color: true, icono: true } },
} satisfies Prisma.RecurrenciaInclude;

type RecurrenciaConRelaciones = Prisma.RecurrenciaGetPayload<{ include: typeof INCLUIR }>;

type Cliente = Prisma.TransactionClient | PrismaService;

function reglaDe(r: RecurrenciaDb): ReglaRecurrencia {
  return {
    frecuencia: r.frecuencia,
    diaDelMes: r.diaDelMes,
    mesDelAnio: r.mesDelAnio,
    desde: fechaDeDb(r.desde),
    hasta: r.hasta ? fechaDeDb(r.hasta) : null,
  };
}

function aRecurrencia(r: RecurrenciaConRelaciones, hoyArg: Fecha): Recurrencia {
  const proxima = r.activa ? proximaOcurrencia(reglaDe(r), hoyArg, r.ultimoPeriodoGenerado) : null;
  return {
    id: r.id,
    tipo: r.tipo,
    monto: aString2Decimales(r.monto.toString()),
    moneda: r.moneda,
    descripcion: r.descripcion,
    frecuencia: r.frecuencia,
    diaDelMes: r.diaDelMes,
    mesDelAnio: r.mesDelAnio,
    desde: fechaDeDb(r.desde),
    hasta: r.hasta ? fechaDeDb(r.hasta) : null,
    activa: r.activa,
    cuenta: r.cuenta,
    categoria: r.categoria,
    proximaFecha: proxima?.fecha ?? null,
    creadoEn: r.creadoEn.toISOString(),
  };
}

export interface ResultadoMaterializacion {
  recurrencias: number;
  generados: number;
  errores: number;
}

@Injectable()
export class RecurrenciasService {
  private readonly logger = new Logger(RecurrenciasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentas: CuentasService,
    private readonly categorias: CategoriasService,
  ) {}

  async listar(usuarioId: string, q: ListarRecurrenciasQuery): Promise<Recurrencia[]> {
    const filas = await this.prisma.recurrencia.findMany({
      where: { usuarioId, ...(q.incluirInactivas ? {} : { activa: true }) },
      include: INCLUIR,
      orderBy: [{ activa: 'desc' }, { descripcion: 'asc' }],
    });
    const hoyAr = hoy();
    return filas.map((r) => aRecurrencia(r, hoyAr));
  }

  /** Crea la recurrencia y genera en el momento lo que corresponda hasta hoy. */
  async crear(usuarioId: string, datos: CrearRecurrencia): Promise<Recurrencia> {
    const cuenta = await this.cuentas.obtenerPropia(usuarioId, datos.cuentaId);
    exigirCuentaActiva(cuenta);
    if (datos.categoriaId) {
      exigirCategoriaValida(
        await this.categorias.obtenerPropia(usuarioId, datos.categoriaId),
        datos.tipo,
      );
    }
    const hoyAr = hoy();
    const recurrencia = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.recurrencia.create({
        data: {
          usuarioId,
          cuentaId: cuenta.id,
          categoriaId: datos.categoriaId ?? null,
          tipo: datos.tipo,
          monto: datos.monto,
          moneda: cuenta.moneda,
          descripcion: datos.descripcion,
          frecuencia: datos.frecuencia,
          diaDelMes: datos.diaDelMes,
          mesDelAnio: datos.frecuencia === 'ANUAL' ? (datos.mesDelAnio ?? null) : null,
          desde: fechaADb(datos.desde),
          hasta: datos.hasta ? fechaADb(datos.hasta) : null,
        },
      });
      await this.materializar(tx, creada, hoyAr);
      return tx.recurrencia.findUniqueOrThrow({ where: { id: creada.id }, include: INCLUIR });
    });
    return aRecurrencia(recurrencia, hoyAr);
  }

  /**
   * Los cambios rigen para lo que se genere de ahí en adelante; los movimientos ya
   * generados no se tocan. Al reactivar no se recuperan los períodos en que estuvo
   * inactiva: se sigue desde hoy.
   */
  async actualizar(
    usuarioId: string,
    id: string,
    datos: ActualizarRecurrencia,
  ): Promise<Recurrencia> {
    const actual = await this.obtenerPropia(usuarioId, id);
    const data: Prisma.RecurrenciaUncheckedUpdateInput = {};

    if (datos.cuentaId !== undefined && datos.cuentaId !== actual.cuentaId) {
      const cuenta = await this.cuentas.obtenerPropia(usuarioId, datos.cuentaId);
      exigirCuentaActiva(cuenta);
      if (cuenta.moneda !== actual.moneda) {
        throw noProcesable(
          'CUENTA_MONEDA_DISTINTA',
          `La cuenta "${cuenta.nombre}" es en ${cuenta.moneda} y la recurrencia en ${actual.moneda}`,
        );
      }
      data.cuentaId = cuenta.id;
    }
    if (datos.categoriaId !== undefined && datos.categoriaId !== actual.categoriaId) {
      if (datos.categoriaId) {
        exigirCategoriaValida(
          await this.categorias.obtenerPropia(usuarioId, datos.categoriaId),
          actual.tipo,
        );
      }
      data.categoriaId = datos.categoriaId;
    }
    if (datos.monto !== undefined) data.monto = datos.monto;
    if (datos.descripcion !== undefined) data.descripcion = datos.descripcion;

    // Regla resultante (lo que cambia + lo que queda), validada entera.
    const frecuencia = datos.frecuencia ?? actual.frecuencia;
    const mesDelAnio =
      frecuencia === 'MENSUAL'
        ? null
        : datos.mesDelAnio !== undefined
          ? datos.mesDelAnio
          : actual.mesDelAnio;
    const desde = datos.desde ?? fechaDeDb(actual.desde);
    const hasta =
      datos.hasta !== undefined ? datos.hasta : actual.hasta ? fechaDeDb(actual.hasta) : null;
    if (frecuencia === 'ANUAL' && mesDelAnio == null) {
      throw noProcesable('RECURRENCIA_INVALIDA', 'Una recurrencia anual necesita el mes');
    }
    if (hasta && hasta < desde) {
      throw noProcesable('RECURRENCIA_INVALIDA', '"hasta" no puede ser anterior a "desde"');
    }
    Object.assign(data, {
      frecuencia,
      mesDelAnio,
      diaDelMes: datos.diaDelMes ?? actual.diaDelMes,
      desde: fechaADb(desde),
      hasta: hasta ? fechaADb(hasta) : null,
    });

    const hoyAr = hoy();
    if (datos.activa !== undefined) {
      data.activa = datos.activa;
      if (datos.activa && !actual.activa) {
        // Lo que habría tocado mientras estaba inactiva (hasta ayer) se da por procesado.
        const regla: ReglaRecurrencia = {
          frecuencia,
          mesDelAnio,
          diaDelMes: datos.diaDelMes ?? actual.diaDelMes,
          desde,
          hasta,
        };
        const salteadas = ocurrenciasRecurrencia(
          regla,
          sumarDias(hoyAr, -1),
          actual.ultimoPeriodoGenerado,
        );
        const ultima = salteadas.at(-1);
        if (ultima) data.ultimoPeriodoGenerado = ultima.periodo;
      }
    }

    const recurrencia = await this.prisma.$transaction(async (tx) => {
      const actualizada = await tx.recurrencia.update({ where: { id }, data });
      if (actualizada.activa) await this.materializar(tx, actualizada, hoyAr);
      return tx.recurrencia.findUniqueOrThrow({ where: { id }, include: INCLUIR });
    });
    return aRecurrencia(recurrencia, hoyAr);
  }

  /** Los movimientos ya generados quedan (su recurrenciaId pasa a null por SetNull). */
  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropia(usuarioId, id);
    await this.prisma.recurrencia.delete({ where: { id } });
  }

  /**
   * Job diario: genera los movimientos que falten de todas las recurrencias activas, con
   * fecha hasta `limite` (incluido; nunca futuros). Idempotente: correrlo dos veces no
   * duplica (unique [recurrenciaId, periodoRecurrencia] + ultimoPeriodoGenerado).
   * Si una recurrencia falla, se loguea y sigue con las demás.
   */
  async materializarTodas(limite: Fecha = hoy()): Promise<ResultadoMaterializacion> {
    const recurrencias = await this.prisma.recurrencia.findMany({
      where: { activa: true, desde: { lte: fechaADb(limite) } },
      orderBy: { creadoEn: 'asc' },
    });
    const resultado: ResultadoMaterializacion = {
      recurrencias: recurrencias.length,
      generados: 0,
      errores: 0,
    };
    for (const r of recurrencias) {
      try {
        resultado.generados += await this.prisma.$transaction((tx) =>
          this.materializar(tx, r, limite),
        );
      } catch (error) {
        resultado.errores++;
        this.logger.error(
          `No se pudo materializar la recurrencia ${r.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return resultado;
  }

  /** Genera los movimientos pendientes de una recurrencia y avanza ultimoPeriodoGenerado. */
  private async materializar(db: Cliente, r: RecurrenciaDb, limite: Fecha): Promise<number> {
    const ocurrencias = ocurrenciasRecurrencia(reglaDe(r), limite, r.ultimoPeriodoGenerado);
    const ultima = ocurrencias.at(-1);
    if (!ultima) return 0;
    const { count } = await db.movimiento.createMany({
      data: ocurrencias.map((o) => ({
        usuarioId: r.usuarioId,
        cuentaId: r.cuentaId,
        categoriaId: r.categoriaId,
        tipo: r.tipo,
        monto: r.monto,
        moneda: r.moneda,
        fecha: fechaADb(o.fecha),
        descripcion: r.descripcion,
        recurrenciaId: r.id,
        periodoRecurrencia: o.periodo,
      })),
      skipDuplicates: true,
    });
    await db.recurrencia.update({
      where: { id: r.id },
      data: { ultimoPeriodoGenerado: ultima.periodo },
    });
    return count;
  }

  private async obtenerPropia(usuarioId: string, id: string): Promise<RecurrenciaDb> {
    const recurrencia = await this.prisma.recurrencia.findFirst({ where: { id, usuarioId } });
    if (!recurrencia) throw noEncontrado('No encontramos la recurrencia');
    return recurrencia;
  }
}
