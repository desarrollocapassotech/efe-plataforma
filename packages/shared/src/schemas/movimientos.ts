import { z } from 'zod';
import { FechaSchema, IdSchema, MonedaSchema, MontoSchema, PaginacionQuerySchema } from './base';
import { TipoMovimientoSchema } from './categorias';
import { TipoCuentaSchema } from './cuentas';
import { paginaSchema } from './paginacion';

const descripcion = z.string().trim().max(200).nullable();

/** POST /movimientos. La moneda no se manda: es la de la cuenta. */
export const CrearMovimientoSchema = z.strictObject({
  cuentaId: IdSchema,
  categoriaId: IdSchema.nullable().optional(),
  tipo: TipoMovimientoSchema,
  monto: MontoSchema,
  fecha: FechaSchema,
  descripcion: descripcion.optional(),
});
export type CrearMovimiento = z.infer<typeof CrearMovimientoSchema>;

/**
 * PATCH /movimientos/:id. El tipo no se cambia. Si el movimiento vino de una recurrencia,
 * al editarlo se desvincula de ella (el job ya no lo regenera).
 */
export const ActualizarMovimientoSchema = z
  .strictObject({
    cuentaId: IdSchema,
    categoriaId: IdSchema.nullable(),
    monto: MontoSchema,
    fecha: FechaSchema,
    descripcion,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarMovimiento = z.infer<typeof ActualizarMovimientoSchema>;

const rangoValido = (d: { desde?: string; hasta?: string }) =>
  !d.desde || !d.hasta || d.desde <= d.hasta;

/** GET /movimientos: filtros + paginación por cursor (fecha desc, creación desc). */
export const ListarMovimientosQuerySchema = PaginacionQuerySchema.extend({
  desde: FechaSchema.optional(),
  hasta: FechaSchema.optional(),
  tipo: TipoMovimientoSchema.optional(),
  cuentaId: IdSchema.optional(),
  categoriaId: IdSchema.optional(),
  /** Búsqueda en la descripción, sin distinguir mayúsculas. */
  q: z.string().trim().min(1).max(100).optional(),
}).refine(rangoValido, { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] });
export type ListarMovimientosQuery = z.infer<typeof ListarMovimientosQuerySchema>;

export const CuentaResumidaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: TipoCuentaSchema,
  moneda: MonedaSchema,
});
export type CuentaResumida = z.infer<typeof CuentaResumidaSchema>;

export const CategoriaResumidaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  color: z.string(),
  icono: z.string(),
});
export type CategoriaResumida = z.infer<typeof CategoriaResumidaSchema>;

export const MovimientoSchema = z.object({
  id: z.string(),
  tipo: TipoMovimientoSchema,
  /** Siempre positivo: el tipo dice si suma o resta. */
  monto: z.string(),
  moneda: MonedaSchema,
  fecha: FechaSchema,
  descripcion: z.string().nullable(),
  cuenta: CuentaResumidaSchema,
  categoria: CategoriaResumidaSchema.nullable(),
  /** Si lo generó una recurrencia (ingreso o gasto fijo). */
  recurrenciaId: z.string().nullable(),
  creadoEn: z.iso.datetime(),
});
export type Movimiento = z.infer<typeof MovimientoSchema>;

export const PaginaMovimientosSchema = paginaSchema(MovimientoSchema);

// --- Transferencias -----------------------------------------------------------------

/**
 * POST /transferencias. Misma moneda: montoDestino es opcional y tiene que ser igual a
 * montoOrigen. Monedas distintas (compra/venta de dólares): montoDestino es obligatorio.
 */
export const CrearTransferenciaSchema = z
  .strictObject({
    cuentaOrigenId: IdSchema,
    cuentaDestinoId: IdSchema,
    montoOrigen: MontoSchema,
    montoDestino: MontoSchema.optional(),
    fecha: FechaSchema,
    descripcion: descripcion.optional(),
  })
  .refine((d) => d.cuentaOrigenId !== d.cuentaDestinoId, {
    message: 'La cuenta de origen y la de destino tienen que ser distintas',
    path: ['cuentaDestinoId'],
  });
export type CrearTransferencia = z.infer<typeof CrearTransferenciaSchema>;

/** PATCH /transferencias/:id. El resultado se valida igual que al crear. */
export const ActualizarTransferenciaSchema = z
  .strictObject({
    cuentaOrigenId: IdSchema,
    cuentaDestinoId: IdSchema,
    montoOrigen: MontoSchema,
    montoDestino: MontoSchema,
    fecha: FechaSchema,
    descripcion,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarTransferencia = z.infer<typeof ActualizarTransferenciaSchema>;

export const ListarTransferenciasQuerySchema = PaginacionQuerySchema.extend({
  desde: FechaSchema.optional(),
  hasta: FechaSchema.optional(),
  /** Transferencias donde la cuenta es origen o destino. */
  cuentaId: IdSchema.optional(),
}).refine(rangoValido, { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] });
export type ListarTransferenciasQuery = z.infer<typeof ListarTransferenciasQuerySchema>;

export const TransferenciaSchema = z.object({
  id: z.string(),
  cuentaOrigen: CuentaResumidaSchema,
  cuentaDestino: CuentaResumidaSchema,
  montoOrigen: z.string(),
  montoDestino: z.string(),
  /** Pesos por dólar si las monedas son distintas; null si son iguales. */
  cotizacion: z.string().nullable(),
  fecha: FechaSchema,
  descripcion: z.string().nullable(),
  creadoEn: z.iso.datetime(),
});
export type Transferencia = z.infer<typeof TransferenciaSchema>;

export const PaginaTransferenciasSchema = paginaSchema(TransferenciaSchema);
