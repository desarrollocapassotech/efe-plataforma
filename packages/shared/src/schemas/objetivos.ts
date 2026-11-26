import { z } from 'zod';
import { FechaSchema, ImporteSchema, MonedaSchema, MontoSchema } from './base';

export const ESTADOS_OBJETIVO = ['ACTIVO', 'CUMPLIDO', 'ARCHIVADO'] as const;
export type EstadoObjetivo = (typeof ESTADOS_OBJETIVO)[number];
export const EstadoObjetivoSchema = z.enum(ESTADOS_OBJETIVO);

const nombre = z.string().trim().min(1, 'Poné un nombre').max(60);
const icono = z.string().trim().min(1).max(16);

/** POST /objetivos */
export const CrearObjetivoSchema = z.strictObject({
  nombre,
  icono: icono.nullable().optional(),
  montoObjetivo: MontoSchema,
  moneda: MonedaSchema.default('ARS'),
  fechaObjetivo: FechaSchema.nullable().optional(),
  aporteMensualPlaneado: MontoSchema.nullable().optional(),
});
export type CrearObjetivo = z.input<typeof CrearObjetivoSchema>;

/**
 * PATCH /objetivos/:id. CUMPLIDO solo se puede marcar al llegar al 100 % (no es
 * automático). La moneda no se cambia si ya tiene aportes.
 */
export const ActualizarObjetivoSchema = z
  .strictObject({
    nombre,
    icono: icono.nullable(),
    montoObjetivo: MontoSchema,
    moneda: MonedaSchema,
    fechaObjetivo: FechaSchema.nullable(),
    aporteMensualPlaneado: MontoSchema.nullable(),
    estado: EstadoObjetivoSchema,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarObjetivo = z.infer<typeof ActualizarObjetivoSchema>;

/** POST /objetivos/:id/aportes. Negativo = retiro. */
export const CrearAporteSchema = z.strictObject({
  monto: ImporteSchema.refine((v) => !/^-?0+(\.0+)?$/.test(v), {
    message: 'El monto no puede ser cero',
  }),
  fecha: FechaSchema,
  nota: z.string().trim().max(200).nullable().optional(),
});
export type CrearAporte = z.infer<typeof CrearAporteSchema>;

export const AporteSchema = z.object({
  id: z.string(),
  monto: z.string(),
  fecha: FechaSchema,
  nota: z.string().nullable(),
  creadoEn: z.iso.datetime(),
});
export type Aporte = z.infer<typeof AporteSchema>;

export const AvanceSchema = z.object({
  acumulado: z.string(),
  porcentaje: z.string(),
  faltante: z.string(),
  mesesRestantes: z.number().int().nullable(),
  aporteMensualSugerido: z.string().nullable(),
  ritmoMensual: z.string(),
  fechaEstimada: FechaSchema.nullable(),
  enCamino: z.boolean(),
});

export const ObjetivoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  icono: z.string().nullable(),
  montoObjetivo: z.string(),
  moneda: MonedaSchema,
  fechaObjetivo: FechaSchema.nullable(),
  aporteMensualPlaneado: z.string().nullable(),
  estado: EstadoObjetivoSchema,
  creadoEn: z.iso.datetime(),
  avance: AvanceSchema,
});
export type Objetivo = z.infer<typeof ObjetivoSchema>;

/** GET /objetivos/:id: el objetivo con su historial de aportes (más nuevo primero). */
export const ObjetivoDetalleSchema = ObjetivoSchema.extend({ aportes: z.array(AporteSchema) });
export type ObjetivoDetalle = z.infer<typeof ObjetivoDetalleSchema>;
