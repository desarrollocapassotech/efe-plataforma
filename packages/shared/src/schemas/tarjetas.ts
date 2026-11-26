import { z } from 'zod';
import { periodoDe } from '../fechas';
import {
  BooleanoQuerySchema,
  ColorSchema,
  FechaSchema,
  IdSchema,
  MonedaSchema,
  MontoSchema,
  PaginacionQuerySchema,
  PeriodoSchema,
} from './base';
import { CategoriaResumidaSchema, CuentaResumidaSchema } from './movimientos';
import { paginaSchema } from './paginacion';

export const REDES_TARJETA = ['VISA', 'MASTERCARD', 'AMEX', 'CABAL', 'NARANJA', 'OTRA'] as const;
export type RedTarjeta = (typeof REDES_TARJETA)[number];
export const RedTarjetaSchema = z.enum(REDES_TARJETA);

const nombre = z.string().trim().min(1, 'Poné un nombre').max(40);
const dia = z.number().int().min(1).max(31);
const ultimos4 = z.string().regex(/^\d{4}$/, { message: 'Tienen que ser 4 números' });

/** El período de un resumen y sus fechas (período = mes del vencimiento). */
export const ResumenFechasSchema = z.object({
  periodo: PeriodoSchema,
  fechaCierre: FechaSchema,
  fechaVencimiento: FechaSchema,
});
export type ResumenFechas = z.infer<typeof ResumenFechasSchema>;

export const TotalMonedaSchema = z.object({
  moneda: MonedaSchema,
  total: z.string(),
});
export type TotalMoneda = z.infer<typeof TotalMonedaSchema>;

/** Total de un resumen por moneda, con lo pagado y lo que falta pagar. */
export const SaldoResumenSchema = z.object({
  moneda: MonedaSchema,
  total: z.string(),
  pagado: z.string(),
  /** total − pagado (nunca negativo). */
  pendiente: z.string(),
});
export type SaldoResumen = z.infer<typeof SaldoResumenSchema>;

// --- Tarjetas -----------------------------------------------------------------------

/** POST /tarjetas */
export const CrearTarjetaSchema = z.strictObject({
  nombre,
  red: RedTarjetaSchema.default('OTRA'),
  ultimos4: ultimos4.nullable().optional(),
  diaCierre: dia,
  diaVencimiento: dia,
  color: ColorSchema.nullable().optional(),
});
export type CrearTarjeta = z.input<typeof CrearTarjetaSchema>;

/** PATCH /tarjetas/:id. Cambiar el día de cierre o de vencimiento recalcula las cuotas. */
export const ActualizarTarjetaSchema = z
  .strictObject({
    nombre,
    red: RedTarjetaSchema,
    ultimos4: ultimos4.nullable(),
    diaCierre: dia,
    diaVencimiento: dia,
    color: ColorSchema.nullable(),
    archivada: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarTarjeta = z.infer<typeof ActualizarTarjetaSchema>;

export const ListarTarjetasQuerySchema = z.object({
  incluirArchivadas: BooleanoQuerySchema.default(false),
});
export type ListarTarjetasQuery = z.infer<typeof ListarTarjetasQuerySchema>;

export const TarjetaResumidaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  red: RedTarjetaSchema,
  ultimos4: z.string().nullable(),
  color: z.string().nullable(),
});
export type TarjetaResumida = z.infer<typeof TarjetaResumidaSchema>;

export const TarjetaSchema = TarjetaResumidaSchema.extend({
  diaCierre: z.number().int(),
  diaVencimiento: z.number().int(),
  archivada: z.boolean(),
  creadoEn: z.iso.datetime(),
  /** El próximo resumen a pagar (vence hoy o después) y cuánto suma por moneda. */
  proximoResumen: ResumenFechasSchema.extend({ saldos: z.array(SaldoResumenSchema) }),
});
export type Tarjeta = z.infer<typeof TarjetaSchema>;

/**
 * PUT /tarjetas/:id/cierres/:periodo: fechas reales de un resumen (las que dice el banco).
 * El período es el mes del vencimiento, así que el vencimiento tiene que caer en ese mes.
 */
export const CierreTarjetaSchema = z
  .strictObject({ fechaCierre: FechaSchema, fechaVencimiento: FechaSchema })
  .refine((d) => d.fechaVencimiento > d.fechaCierre, {
    message: 'El vencimiento tiene que ser posterior al cierre',
    path: ['fechaVencimiento'],
  });
export type CierreTarjeta = z.infer<typeof CierreTarjetaSchema>;

/** ¿Las fechas de un override corresponden a ese período? (vencimiento en ese mes). */
export const cierreCorrespondeAPeriodo = (periodo: string, c: CierreTarjeta) =>
  periodoDe(c.fechaVencimiento) === periodo;

// --- Compras ------------------------------------------------------------------------

const descripcion = z.string().trim().min(1, 'Poné qué compraste').max(200);
const cantidadCuotas = z.number().int().min(1).max(72);

/** POST /tarjetas/compras. Una tarjeta puede tener compras en pesos y en dólares. */
export const CrearCompraSchema = z.strictObject({
  tarjetaId: IdSchema,
  categoriaId: IdSchema.nullable().optional(),
  descripcion,
  fecha: FechaSchema,
  montoTotal: MontoSchema,
  moneda: MonedaSchema.default('ARS'),
  cantidadCuotas: cantidadCuotas.default(1),
});
export type CrearCompra = z.input<typeof CrearCompraSchema>;

/** PATCH /tarjetas/compras/:id. Regenera las cuotas. */
export const ActualizarCompraSchema = z
  .strictObject({
    tarjetaId: IdSchema,
    categoriaId: IdSchema.nullable(),
    descripcion,
    fecha: FechaSchema,
    montoTotal: MontoSchema,
    moneda: MonedaSchema,
    cantidadCuotas,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarCompra = z.infer<typeof ActualizarCompraSchema>;

export const ListarComprasQuerySchema = PaginacionQuerySchema.extend({
  tarjetaId: IdSchema.optional(),
  desde: FechaSchema.optional(),
  hasta: FechaSchema.optional(),
}).refine((d) => !d.desde || !d.hasta || d.desde <= d.hasta, {
  message: '"desde" no puede ser posterior a "hasta"',
  path: ['desde'],
});
export type ListarComprasQuery = z.infer<typeof ListarComprasQuerySchema>;

export const CuotaSchema = z.object({
  numero: z.number().int(),
  monto: z.string(),
  periodoResumen: PeriodoSchema,
});
export type Cuota = z.infer<typeof CuotaSchema>;

export const CompraSchema = z.object({
  id: z.string(),
  tarjeta: TarjetaResumidaSchema,
  categoria: CategoriaResumidaSchema.nullable(),
  descripcion: z.string(),
  fecha: FechaSchema,
  montoTotal: z.string(),
  moneda: MonedaSchema,
  cantidadCuotas: z.number().int(),
  cuotas: z.array(CuotaSchema),
  creadoEn: z.iso.datetime(),
});
export type Compra = z.infer<typeof CompraSchema>;

export const PaginaComprasSchema = paginaSchema(CompraSchema);

// --- Resumen y compromisos ----------------------------------------------------------

/** GET /tarjetas/resumen. Sin tarjeta: todas las activas. Sin período: el próximo a vencer. */
export const ResumenTarjetaQuerySchema = z.object({
  tarjetaId: IdSchema.optional(),
  periodo: PeriodoSchema.optional(),
});
export type ResumenTarjetaQuery = z.infer<typeof ResumenTarjetaQuerySchema>;

export const CuotaDeResumenSchema = z.object({
  compraId: z.string(),
  descripcion: z.string(),
  fechaCompra: FechaSchema,
  numero: z.number().int(),
  cantidadCuotas: z.number().int(),
  monto: z.string(),
  /** Total de la compra (para editarla desde el resumen). */
  montoTotal: z.string(),
  moneda: MonedaSchema,
  categoria: CategoriaResumidaSchema.nullable(),
});
export type CuotaDeResumen = z.infer<typeof CuotaDeResumenSchema>;

export const PagoResumenSchema = z.object({
  id: z.string(),
  tarjeta: TarjetaResumidaSchema,
  cuenta: CuentaResumidaSchema,
  periodo: PeriodoSchema,
  monto: z.string(),
  moneda: MonedaSchema,
  fecha: FechaSchema,
  creadoEn: z.iso.datetime(),
});
export type PagoResumen = z.infer<typeof PagoResumenSchema>;

export const ResumenTarjetaSchema = ResumenFechasSchema.extend({
  tarjeta: TarjetaResumidaSchema,
  /** true si las fechas las cargó el usuario (override) y no son las calculadas. */
  fechasManuales: z.boolean(),
  cuotas: z.array(CuotaDeResumenSchema),
  saldos: z.array(SaldoResumenSchema),
  pagos: z.array(PagoResumenSchema),
});
export type ResumenTarjeta = z.infer<typeof ResumenTarjetaSchema>;

/** GET /tarjetas/compromisos: los próximos `meses` períodos, desde el mes actual. */
export const CompromisosQuerySchema = z.object({
  meses: z.coerce.number().int().min(1).max(36).default(12),
});
export type CompromisosQuery = z.infer<typeof CompromisosQuerySchema>;

export const CompromisoPeriodoSchema = z.object({
  periodo: PeriodoSchema,
  totales: z.array(TotalMonedaSchema),
  porTarjeta: z.array(
    z.object({ tarjeta: TarjetaResumidaSchema, moneda: MonedaSchema, total: z.string() }),
  ),
});
export type CompromisoPeriodo = z.infer<typeof CompromisoPeriodoSchema>;

export const CompromisosSchema = z.object({
  desde: PeriodoSchema,
  hasta: PeriodoSchema,
  periodos: z.array(CompromisoPeriodoSchema),
});
export type Compromisos = z.infer<typeof CompromisosSchema>;

// --- Pagos de resumen ---------------------------------------------------------------

/** POST /tarjetas/pagos. La cuenta tiene que ser de la misma moneda que el pago. */
export const CrearPagoResumenSchema = z.strictObject({
  tarjetaId: IdSchema,
  cuentaId: IdSchema,
  periodo: PeriodoSchema,
  monto: MontoSchema,
  moneda: MonedaSchema,
  fecha: FechaSchema,
});
export type CrearPagoResumen = z.infer<typeof CrearPagoResumenSchema>;

export const ListarPagosQuerySchema = z.object({
  tarjetaId: IdSchema.optional(),
  periodo: PeriodoSchema.optional(),
});
export type ListarPagosQuery = z.infer<typeof ListarPagosQuerySchema>;
