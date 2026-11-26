import { Injectable } from '@nestjs/common';
import { aString2Decimales, comparar, cotizacionImplicita } from '@efe/shared/dinero';
import type {
  ActualizarTransferencia,
  CrearTransferencia,
  ListarTransferenciasQuery,
  Pagina,
  Transferencia,
} from '@efe/shared/schemas';
import { type Cuenta, Prisma } from '@prisma/client';
import { noEncontrado, noProcesable } from '../../common/errors/errores';
import { fechaADb, fechaDeDb } from '../../common/fechas';
import {
  armarPagina,
  decodificarCursor,
  despuesDe,
  ORDEN_CRONOLOGICO_DESC,
} from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasService, exigirCuentaActiva } from '../cuentas/cuentas.service';

const CUENTA_RESUMIDA = { select: { id: true, nombre: true, tipo: true, moneda: true } } as const;
const INCLUIR = {
  cuentaOrigen: CUENTA_RESUMIDA,
  cuentaDestino: CUENTA_RESUMIDA,
} satisfies Prisma.TransferenciaInclude;

type TransferenciaDb = Prisma.TransferenciaGetPayload<{ include: typeof INCLUIR }>;

function aTransferencia(t: TransferenciaDb): Transferencia {
  const montoOrigen = aString2Decimales(t.montoOrigen.toString());
  const montoDestino = aString2Decimales(t.montoDestino.toString());
  return {
    id: t.id,
    cuentaOrigen: t.cuentaOrigen,
    cuentaDestino: t.cuentaDestino,
    montoOrigen,
    montoDestino,
    cotizacion: cotizacionImplicita(
      { moneda: t.cuentaOrigen.moneda, monto: montoOrigen },
      { moneda: t.cuentaDestino.moneda, monto: montoDestino },
    ),
    fecha: fechaDeDb(t.fecha),
    descripcion: t.descripcion,
    creadoEn: t.creadoEn.toISOString(),
  };
}

/**
 * Misma moneda: el destino recibe exactamente lo que sale del origen (si se manda
 * montoDestino distinto → 422). Monedas distintas: hacen falta los dos montos, y la
 * cotización queda implícita.
 */
function resolverMontoDestino(
  origen: Cuenta,
  destino: Cuenta,
  montoOrigen: string,
  montoDestino: string | undefined,
): string {
  if (origen.moneda === destino.moneda) {
    if (montoDestino !== undefined && comparar(montoDestino, montoOrigen) !== 0) {
      throw noProcesable(
        'MONTO_DESTINO_INVALIDO',
        'Entre cuentas de la misma moneda, el monto de destino tiene que ser igual al de origen',
      );
    }
    return montoOrigen;
  }
  if (montoDestino === undefined) {
    throw noProcesable(
      'MONTO_DESTINO_REQUERIDO',
      `Entre ${origen.moneda} y ${destino.moneda} hace falta el monto que llega a la cuenta de destino`,
    );
  }
  return montoDestino;
}

@Injectable()
export class TransferenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cuentas: CuentasService,
  ) {}

  async listar(usuarioId: string, q: ListarTransferenciasQuery): Promise<Pagina<Transferencia>> {
    const where: Prisma.TransferenciaWhereInput = {
      usuarioId,
      ...(q.desde || q.hasta
        ? {
            fecha: {
              ...(q.desde ? { gte: fechaADb(q.desde) } : {}),
              ...(q.hasta ? { lte: fechaADb(q.hasta) } : {}),
            },
          }
        : {}),
      AND: [
        ...(q.cuentaId
          ? [{ OR: [{ cuentaOrigenId: q.cuentaId }, { cuentaDestinoId: q.cuentaId }] }]
          : []),
        ...(q.cursor ? [despuesDe(decodificarCursor(q.cursor))] : []),
      ],
    };
    const filas = await this.prisma.transferencia.findMany({
      where,
      include: INCLUIR,
      orderBy: ORDEN_CRONOLOGICO_DESC,
      take: q.limit + 1,
    });
    return armarPagina(filas, q.limit, aTransferencia);
  }

  async crear(usuarioId: string, datos: CrearTransferencia): Promise<Transferencia> {
    const [origen, destino] = await Promise.all([
      this.cuentas.obtenerPropia(usuarioId, datos.cuentaOrigenId),
      this.cuentas.obtenerPropia(usuarioId, datos.cuentaDestinoId),
    ]);
    exigirCuentaActiva(origen);
    exigirCuentaActiva(destino);
    const montoDestino = resolverMontoDestino(
      origen,
      destino,
      datos.montoOrigen,
      datos.montoDestino,
    );
    const transferencia = await this.prisma.transferencia.create({
      data: {
        usuarioId,
        cuentaOrigenId: origen.id,
        cuentaDestinoId: destino.id,
        montoOrigen: datos.montoOrigen,
        montoDestino,
        fecha: fechaADb(datos.fecha),
        descripcion: datos.descripcion ?? null,
      },
      include: INCLUIR,
    });
    return aTransferencia(transferencia);
  }

  /** El resultado (lo que cambia + lo que queda) se valida con las mismas reglas que al crear. */
  async actualizar(
    usuarioId: string,
    id: string,
    datos: ActualizarTransferencia,
  ): Promise<Transferencia> {
    const actual = await this.obtenerPropia(usuarioId, id);
    const origenId = datos.cuentaOrigenId ?? actual.cuentaOrigenId;
    const destinoId = datos.cuentaDestinoId ?? actual.cuentaDestinoId;
    if (origenId === destinoId) {
      throw noProcesable(
        'CUENTAS_IGUALES',
        'La cuenta de origen y la de destino tienen que ser distintas',
      );
    }
    const [origen, destino] = await Promise.all([
      this.cuentas.obtenerPropia(usuarioId, origenId),
      this.cuentas.obtenerPropia(usuarioId, destinoId),
    ]);
    if (origenId !== actual.cuentaOrigenId) exigirCuentaActiva(origen);
    if (destinoId !== actual.cuentaDestinoId) exigirCuentaActiva(destino);

    const montoOrigen = datos.montoOrigen ?? actual.montoOrigen.toString();
    // Si era y sigue siendo entre monedas distintas y no se manda montoDestino, se conserva
    // el anterior. Si pasa a ser de la misma moneda, el destino vuelve a ser igual al origen.
    const eranDistintas = actual.cuentaOrigen.moneda !== actual.cuentaDestino.moneda;
    const sonDistintas = origen.moneda !== destino.moneda;
    const montoDestinoPedido =
      datos.montoDestino ??
      (eranDistintas && sonDistintas ? actual.montoDestino.toString() : undefined);
    const montoDestino = resolverMontoDestino(origen, destino, montoOrigen, montoDestinoPedido);

    const transferencia = await this.prisma.transferencia.update({
      where: { id },
      data: {
        cuentaOrigenId: origenId,
        cuentaDestinoId: destinoId,
        montoOrigen,
        montoDestino,
        ...(datos.fecha !== undefined ? { fecha: fechaADb(datos.fecha) } : {}),
        ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
      },
      include: INCLUIR,
    });
    return aTransferencia(transferencia);
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropia(usuarioId, id);
    await this.prisma.transferencia.delete({ where: { id } });
  }

  private async obtenerPropia(usuarioId: string, id: string): Promise<TransferenciaDb> {
    const transferencia = await this.prisma.transferencia.findFirst({
      where: { id, usuarioId },
      include: INCLUIR,
    });
    if (!transferencia) throw noEncontrado('No encontramos la transferencia');
    return transferencia;
  }
}
