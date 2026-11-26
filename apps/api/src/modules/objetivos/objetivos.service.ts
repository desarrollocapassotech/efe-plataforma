import { Injectable } from '@nestjs/common';
import { aString2Decimales, comparar } from '@efe/shared/dinero';
import { hoy } from '@efe/shared/fechas';
import { calcularAvance, inicioRitmo } from '@efe/shared/objetivos';
import type {
  ActualizarObjetivo,
  Aporte,
  CrearAporte,
  CrearObjetivo,
  Objetivo,
  ObjetivoDetalle,
} from '@efe/shared/schemas';
import { Prisma, type AporteObjetivo, type Objetivo as ObjetivoDb } from '@prisma/client';
import { conflicto, noEncontrado, noProcesable } from '../../common/errors/errores';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import { PrismaService } from '../../prisma/prisma.service';

const dec = (v: { toString(): string } | null | undefined) =>
  aString2Decimales(v ? v.toString() : '0');

function aAporte(a: AporteObjetivo): Aporte {
  return {
    id: a.id,
    monto: dec(a.monto),
    fecha: fechaDeDb(a.fecha),
    nota: a.nota,
    creadoEn: a.creadoEn.toISOString(),
  };
}

@Injectable()
export class ObjetivosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Activos primero (los más nuevos arriba), después cumplidos y archivados. */
  async listar(usuarioId: string): Promise<Objetivo[]> {
    const objetivos = await this.prisma.objetivo.findMany({
      where: { usuarioId },
      orderBy: [{ estado: 'asc' }, { creadoEn: 'desc' }],
    });
    return this.conAvance(objetivos);
  }

  async obtener(usuarioId: string, id: string): Promise<ObjetivoDetalle> {
    const objetivo = await this.obtenerPropio(usuarioId, id);
    const [[conAvance], aportes] = await Promise.all([
      this.conAvance([objetivo]),
      this.prisma.aporteObjetivo.findMany({
        where: { objetivoId: id },
        orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
      }),
    ]);
    return { ...conAvance!, aportes: aportes.map(aAporte) };
  }

  async crear(usuarioId: string, datos: CrearObjetivo): Promise<Objetivo> {
    const objetivo = await this.prisma.objetivo.create({
      data: {
        usuarioId,
        nombre: datos.nombre,
        icono: datos.icono ?? null,
        montoObjetivo: datos.montoObjetivo,
        moneda: datos.moneda ?? 'ARS',
        fechaObjetivo: datos.fechaObjetivo ? fechaADb(datos.fechaObjetivo) : null,
        aporteMensualPlaneado: datos.aporteMensualPlaneado ?? null,
      },
    });
    const [conAvance] = await this.conAvance([objetivo]);
    return conAvance!;
  }

  async actualizar(usuarioId: string, id: string, datos: ActualizarObjetivo): Promise<Objetivo> {
    const actual = await this.obtenerPropio(usuarioId, id);
    if (datos.moneda && datos.moneda !== actual.moneda) {
      const aportes = await this.prisma.aporteObjetivo.count({ where: { objetivoId: id } });
      if (aportes > 0) {
        throw conflicto(
          'OBJETIVO_MONEDA_BLOQUEADA',
          'No se puede cambiar la moneda de un objetivo que ya tiene aportes',
        );
      }
    }
    if (datos.estado === 'CUMPLIDO' && actual.estado !== 'CUMPLIDO') {
      const [conAvance] = await this.conAvance([
        {
          ...actual,
          montoObjetivo: datos.montoObjetivo
            ? new Prisma.Decimal(datos.montoObjetivo)
            : actual.montoObjetivo,
        },
      ]);
      if (comparar(conAvance!.avance.porcentaje, 100) < 0) {
        throw noProcesable(
          'OBJETIVO_INCOMPLETO',
          'Para marcarlo como cumplido tenés que llegar al 100 %',
        );
      }
    }
    const objetivo = await this.prisma.objetivo.update({
      where: { id },
      data: {
        ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
        ...(datos.icono !== undefined ? { icono: datos.icono } : {}),
        ...(datos.montoObjetivo !== undefined ? { montoObjetivo: datos.montoObjetivo } : {}),
        ...(datos.moneda !== undefined ? { moneda: datos.moneda } : {}),
        ...(datos.fechaObjetivo !== undefined
          ? { fechaObjetivo: datos.fechaObjetivo ? fechaADb(datos.fechaObjetivo) : null }
          : {}),
        ...(datos.aporteMensualPlaneado !== undefined
          ? { aporteMensualPlaneado: datos.aporteMensualPlaneado }
          : {}),
        ...(datos.estado !== undefined ? { estado: datos.estado } : {}),
      },
    });
    const [conAvance] = await this.conAvance([objetivo]);
    return conAvance!;
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropio(usuarioId, id);
    await this.prisma.objetivo.delete({ where: { id } }); // Los aportes se van en cascada.
  }

  async aportar(usuarioId: string, id: string, datos: CrearAporte): Promise<Aporte> {
    const objetivo = await this.obtenerPropio(usuarioId, id);
    if (objetivo.estado === 'ARCHIVADO') {
      throw noProcesable('OBJETIVO_ARCHIVADO', 'El objetivo está archivado');
    }
    const aporte = await this.prisma.aporteObjetivo.create({
      data: {
        objetivoId: id,
        monto: datos.monto,
        fecha: fechaADb(datos.fecha),
        nota: datos.nota ?? null,
      },
    });
    return aAporte(aporte);
  }

  async borrarAporte(usuarioId: string, id: string, aporteId: string): Promise<void> {
    await this.obtenerPropio(usuarioId, id);
    const { count } = await this.prisma.aporteObjetivo.deleteMany({
      where: { id: aporteId, objetivoId: id },
    });
    if (count === 0) throw noEncontrado('No encontramos el aporte');
  }

  private async obtenerPropio(usuarioId: string, id: string): Promise<ObjetivoDb> {
    const objetivo = await this.prisma.objetivo.findFirst({ where: { id, usuarioId } });
    if (!objetivo) throw noEncontrado('No encontramos el objetivo');
    return objetivo;
  }

  /**
   * Agrega el avance a cada objetivo con dos agregados en SQL (total de aportes y lo
   * aportado en los últimos meses, por objetivo); el cálculo es el de @efe/shared.
   */
  private async conAvance(objetivos: ObjetivoDb[]): Promise<Objetivo[]> {
    if (objetivos.length === 0) return [];
    const ids = objetivos.map((o) => o.id);
    const hoyAr = hoy();
    const [totales, recientes] = await Promise.all([
      this.prisma.aporteObjetivo.groupBy({
        by: ['objetivoId'],
        where: { objetivoId: { in: ids } },
        _sum: { monto: true },
      }),
      this.prisma.aporteObjetivo.groupBy({
        by: ['objetivoId'],
        where: {
          objetivoId: { in: ids },
          fecha: { gte: fechaADb(inicioRitmo(hoyAr)), lte: fechaADb(hoyAr) },
        },
        _sum: { monto: true },
      }),
    ]);
    return objetivos.map((o) => {
      const fechaObjetivo = o.fechaObjetivo ? fechaDeDb(o.fechaObjetivo) : null;
      const aporteMensualPlaneado = o.aporteMensualPlaneado ? dec(o.aporteMensualPlaneado) : null;
      return {
        id: o.id,
        nombre: o.nombre,
        icono: o.icono,
        montoObjetivo: dec(o.montoObjetivo),
        moneda: o.moneda,
        fechaObjetivo,
        aporteMensualPlaneado,
        estado: o.estado,
        creadoEn: o.creadoEn.toISOString(),
        avance: calcularAvance({
          montoObjetivo: dec(o.montoObjetivo),
          acumulado: dec(totales.find((t) => t.objetivoId === o.id)?._sum.monto),
          aportadoUltimosMeses: dec(recientes.find((t) => t.objetivoId === o.id)?._sum.monto),
          fechaObjetivo,
          aporteMensualPlaneado,
          hoy: hoyAr,
        }),
      };
    });
  }
}
