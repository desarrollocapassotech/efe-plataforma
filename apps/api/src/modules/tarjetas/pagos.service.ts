import { Injectable } from '@nestjs/common';
import type { CrearPagoResumen, ListarPagosQuery, PagoResumen } from '@efe/shared/schemas';
import { noEncontrado, noProcesable } from '../../common/errors/errores';
import { fechaADb } from '../../common/fechas';
import { PrismaService } from '../../prisma/prisma.service';
import { CuentasService, exigirCuentaActiva } from '../cuentas/cuentas.service';
import { aPago, INCLUIR_PAGO } from './mapeos';
import { TarjetasService } from './tarjetas.service';

/**
 * Pagos de resumen: descuentan del saldo de la cuenta pero NO son gasto (el gasto ya se
 * contó con las cuotas, criterio caja de ARCHITECTURE §5.1).
 */
@Injectable()
export class PagosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tarjetas: TarjetasService,
    private readonly cuentas: CuentasService,
  ) {}

  async listar(usuarioId: string, q: ListarPagosQuery): Promise<PagoResumen[]> {
    const filas = await this.prisma.pagoResumen.findMany({
      where: {
        usuarioId,
        ...(q.tarjetaId ? { tarjetaId: q.tarjetaId } : {}),
        ...(q.periodo ? { periodo: q.periodo } : {}),
      },
      include: INCLUIR_PAGO,
      orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
    });
    return filas.map(aPago);
  }

  async crear(usuarioId: string, datos: CrearPagoResumen): Promise<PagoResumen> {
    // Una tarjeta archivada todavía puede tener un último resumen por pagar: se permite.
    const tarjeta = await this.tarjetas.obtenerPropia(usuarioId, datos.tarjetaId);
    const cuenta = await this.cuentas.obtenerPropia(usuarioId, datos.cuentaId);
    exigirCuentaActiva(cuenta);
    if (cuenta.moneda !== datos.moneda) {
      throw noProcesable(
        'CUENTA_MONEDA_DISTINTA',
        `La cuenta "${cuenta.nombre}" es en ${cuenta.moneda} y el pago en ${datos.moneda}`,
      );
    }
    const pago = await this.prisma.pagoResumen.create({
      data: {
        usuarioId,
        tarjetaId: tarjeta.id,
        cuentaId: cuenta.id,
        periodo: datos.periodo,
        monto: datos.monto,
        moneda: datos.moneda,
        fecha: fechaADb(datos.fecha),
      },
      include: INCLUIR_PAGO,
    });
    return aPago(pago);
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    const { count } = await this.prisma.pagoResumen.deleteMany({ where: { id, usuarioId } });
    if (count === 0) throw noEncontrado('No encontramos el pago');
  }
}
