import { aString2Decimales } from '@efe/shared/dinero';
import type { PagoResumen } from '@efe/shared/schemas';
import { Prisma } from '@prisma/client';
import { fechaDeDb } from '../../common/fechas';

export const INCLUIR_PAGO = {
  tarjeta: { select: { id: true, nombre: true, red: true, ultimos4: true, color: true } },
  cuenta: { select: { id: true, nombre: true, tipo: true, moneda: true } },
} satisfies Prisma.PagoResumenInclude;

type PagoConRelaciones = Prisma.PagoResumenGetPayload<{ include: typeof INCLUIR_PAGO }>;

export function aPago(p: PagoConRelaciones): PagoResumen {
  return {
    id: p.id,
    tarjeta: p.tarjeta,
    cuenta: p.cuenta,
    periodo: p.periodo,
    monto: aString2Decimales(p.monto.toString()),
    moneda: p.moneda,
    fecha: fechaDeDb(p.fecha),
    creadoEn: p.creadoEn.toISOString(),
  };
}
