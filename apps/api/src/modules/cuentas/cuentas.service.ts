import { Injectable } from '@nestjs/common';
import { aString2Decimales } from '@efe/shared/dinero';
import type {
  ActualizarCuenta,
  CrearCuenta,
  Cuenta,
  ListarCuentasQuery,
} from '@efe/shared/schemas';
import { Prisma, type Cuenta as CuentaDb } from '@prisma/client';
import { conflicto, noEncontrado } from '../../common/errors/errores';
import { PrismaService } from '../../prisma/prisma.service';

const decimal = (d: Prisma.Decimal) => aString2Decimales(d.toString());

function aCuenta(c: CuentaDb, saldoActual: string): Cuenta {
  return {
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    moneda: c.moneda,
    color: c.color,
    saldoInicial: decimal(c.saldoInicial),
    saldoActual,
    archivada: c.archivada,
    orden: c.orden,
    creadoEn: c.creadoEn.toISOString(),
  };
}

@Injectable()
export class CuentasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(usuarioId: string, { incluirArchivadas }: ListarCuentasQuery): Promise<Cuenta[]> {
    const [cuentas, saldos] = await Promise.all([
      this.prisma.cuenta.findMany({
        where: { usuarioId, ...(incluirArchivadas ? {} : { archivada: false }) },
        orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
      }),
      this.saldosActuales(usuarioId),
    ]);
    return cuentas.map((c) => aCuenta(c, saldos.get(c.id) ?? decimal(c.saldoInicial)));
  }

  async crear(usuarioId: string, datos: CrearCuenta): Promise<Cuenta> {
    const { _max } = await this.prisma.cuenta.aggregate({
      where: { usuarioId },
      _max: { orden: true },
    });
    const cuenta = await this.prisma.cuenta.create({
      data: { ...datos, usuarioId, orden: (_max.orden ?? -1) + 1 },
    });
    return aCuenta(cuenta, decimal(cuenta.saldoInicial));
  }

  async actualizar(usuarioId: string, id: string, datos: ActualizarCuenta): Promise<Cuenta> {
    const cuenta = await this.obtenerPropia(usuarioId, id);
    if (datos.moneda && datos.moneda !== cuenta.moneda && (await this.tieneOperaciones(id))) {
      throw conflicto(
        'CUENTA_MONEDA_BLOQUEADA',
        'No se puede cambiar la moneda de una cuenta que ya tiene operaciones',
      );
    }
    const actualizada = await this.prisma.cuenta.update({ where: { id }, data: datos });
    const saldos = await this.saldosActuales(usuarioId, id);
    return aCuenta(actualizada, saldos.get(id) ?? decimal(actualizada.saldoInicial));
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropia(usuarioId, id);
    if (await this.tieneOperaciones(id)) {
      throw conflicto(
        'CUENTA_CON_MOVIMIENTOS',
        'La cuenta tiene operaciones registradas. Podés archivarla en lugar de borrarla.',
      );
    }
    await this.prisma.cuenta.delete({ where: { id } });
  }

  /** Cuenta del usuario o 404 (también si es de otro usuario). */
  async obtenerPropia(usuarioId: string, id: string): Promise<CuentaDb> {
    const cuenta = await this.prisma.cuenta.findFirst({ where: { id, usuarioId } });
    if (!cuenta) throw noEncontrado('No encontramos la cuenta');
    return cuenta;
  }

  /** Movimientos, transferencias (como origen o destino), recurrencias o pagos de resumen. */
  private async tieneOperaciones(cuentaId: string): Promise<boolean> {
    const { _count } = await this.prisma.cuenta.findUniqueOrThrow({
      where: { id: cuentaId },
      select: {
        _count: {
          select: {
            movimientos: true,
            transferenciasSalida: true,
            transferenciasEntrada: true,
            recurrencias: true,
            pagosResumen: true,
          },
        },
      },
    });
    return Object.values(_count).some((n) => n > 0);
  }

  /**
   * Saldo actual por cuenta, calculado en SQL (nunca trayendo los movimientos):
   * saldoInicial + ingresos − gastos + transferencias entrantes (montoDestino)
   * − transferencias salientes (montoOrigen) − pagos de resumen.
   * Las cuotas de tarjeta no afectan el saldo: lo hace el pago del resumen.
   */
  private async saldosActuales(usuarioId: string, cuentaId?: string): Promise<Map<string, string>> {
    const filtroCuenta = cuentaId ? Prisma.sql`AND c.id = ${cuentaId}` : Prisma.empty;
    const filas = await this.prisma.$queryRaw<{ id: string; saldo: Prisma.Decimal }[]>`
      SELECT c.id,
             c."saldoInicial"
               + COALESCE(m.neto, 0)
               + COALESCE(te.total, 0)
               - COALESCE(ts.total, 0)
               - COALESCE(p.total, 0) AS saldo
      FROM cuentas c
      LEFT JOIN (
        SELECT "cuentaId", SUM(CASE WHEN tipo = 'INGRESO' THEN monto ELSE -monto END) AS neto
        FROM movimientos WHERE "usuarioId" = ${usuarioId} GROUP BY "cuentaId"
      ) m ON m."cuentaId" = c.id
      LEFT JOIN (
        SELECT "cuentaDestinoId" AS id, SUM("montoDestino") AS total
        FROM transferencias WHERE "usuarioId" = ${usuarioId} GROUP BY "cuentaDestinoId"
      ) te ON te.id = c.id
      LEFT JOIN (
        SELECT "cuentaOrigenId" AS id, SUM("montoOrigen") AS total
        FROM transferencias WHERE "usuarioId" = ${usuarioId} GROUP BY "cuentaOrigenId"
      ) ts ON ts.id = c.id
      LEFT JOIN (
        SELECT "cuentaId", SUM(monto) AS total
        FROM pagos_resumen WHERE "usuarioId" = ${usuarioId} GROUP BY "cuentaId"
      ) p ON p."cuentaId" = c.id
      WHERE c."usuarioId" = ${usuarioId} ${filtroCuenta}
    `;
    return new Map(filas.map((f) => [f.id, decimal(f.saldo)]));
  }
}
