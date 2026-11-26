import { z } from 'zod';
import { BooleanoQuerySchema, ColorSchema, ImporteSchema, MonedaSchema } from './base';

export const TIPOS_CUENTA = ['EFECTIVO', 'BANCO', 'BILLETERA', 'INVERSION', 'OTRA'] as const;
export type TipoCuenta = (typeof TIPOS_CUENTA)[number];
export const TipoCuentaSchema = z.enum(TIPOS_CUENTA);

const nombre = z.string().trim().min(1, 'Poné un nombre').max(60);

/** POST /cuentas */
export const CrearCuentaSchema = z.strictObject({
  nombre,
  tipo: TipoCuentaSchema.default('OTRA'),
  moneda: MonedaSchema.default('ARS'),
  color: ColorSchema.nullable().optional(),
  saldoInicial: ImporteSchema.default('0'),
});
export type CrearCuenta = z.input<typeof CrearCuentaSchema>;

/** PATCH /cuentas/:id. La moneda solo se puede cambiar si la cuenta no tiene operaciones. */
export const ActualizarCuentaSchema = z
  .strictObject({
    nombre,
    tipo: TipoCuentaSchema,
    moneda: MonedaSchema,
    color: ColorSchema.nullable(),
    saldoInicial: ImporteSchema,
    archivada: z.boolean(),
    orden: z.number().int().min(0).max(10_000),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarCuenta = z.infer<typeof ActualizarCuentaSchema>;

/** GET /cuentas */
export const ListarCuentasQuerySchema = z.object({
  incluirArchivadas: BooleanoQuerySchema.default(false),
});
export type ListarCuentasQuery = z.infer<typeof ListarCuentasQuerySchema>;

/** Cuenta en las respuestas. Montos como string con 2 decimales. */
export const CuentaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: TipoCuentaSchema,
  moneda: MonedaSchema,
  color: z.string().nullable(),
  saldoInicial: z.string(),
  /** saldoInicial + ingresos − gastos + transferencias entrantes − salientes − pagos de resumen. */
  saldoActual: z.string(),
  archivada: z.boolean(),
  orden: z.number().int(),
  creadoEn: z.iso.datetime(),
});
export type Cuenta = z.infer<typeof CuentaSchema>;
