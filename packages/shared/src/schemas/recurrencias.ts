import { z } from 'zod';
import { FRECUENCIAS } from '../recurrencias';
import { BooleanoQuerySchema, FechaSchema, IdSchema, MonedaSchema, MontoSchema } from './base';
import { TipoMovimientoSchema } from './categorias';
import { CategoriaResumidaSchema, CuentaResumidaSchema } from './movimientos';

export const FrecuenciaSchema = z.enum(FRECUENCIAS);

const diaDelMes = z.number().int().min(1).max(31);
const mesDelAnio = z.number().int().min(1).max(12);
const descripcion = z.string().trim().min(1, 'Poné una descripción').max(200);

type ConFrecuencia = {
  frecuencia?: 'MENSUAL' | 'ANUAL';
  mesDelAnio?: number | null;
  desde?: string;
  hasta?: string | null;
};

/** ANUAL necesita mes; MENSUAL no lleva mes. hasta >= desde. */
function reglasDeFrecuencia(d: ConFrecuencia, ctx: z.RefinementCtx) {
  if (d.frecuencia === 'ANUAL' && d.mesDelAnio == null) {
    ctx.addIssue({
      code: 'custom',
      path: ['mesDelAnio'],
      message: 'Una recurrencia anual necesita el mes',
    });
  }
  if (d.frecuencia === 'MENSUAL' && d.mesDelAnio != null) {
    ctx.addIssue({
      code: 'custom',
      path: ['mesDelAnio'],
      message: 'Una recurrencia mensual no lleva mes',
    });
  }
  if (d.desde && d.hasta && d.hasta < d.desde) {
    ctx.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: '"hasta" no puede ser anterior a "desde"',
    });
  }
}

/** POST /recurrencias. La moneda es la de la cuenta. */
export const CrearRecurrenciaSchema = z
  .strictObject({
    cuentaId: IdSchema,
    categoriaId: IdSchema.nullable().optional(),
    tipo: TipoMovimientoSchema,
    monto: MontoSchema,
    descripcion,
    frecuencia: FrecuenciaSchema.default('MENSUAL'),
    diaDelMes,
    mesDelAnio: mesDelAnio.nullable().optional(),
    desde: FechaSchema,
    hasta: FechaSchema.nullable().optional(),
  })
  .superRefine(reglasDeFrecuencia);
export type CrearRecurrencia = z.infer<typeof CrearRecurrenciaSchema>;

/**
 * PATCH /recurrencias/:id. Los cambios rigen para lo que se genere de ahí en adelante:
 * no se tocan los movimientos ya generados. El tipo no se cambia.
 */
export const ActualizarRecurrenciaSchema = z
  .strictObject({
    cuentaId: IdSchema,
    categoriaId: IdSchema.nullable(),
    monto: MontoSchema,
    descripcion,
    frecuencia: FrecuenciaSchema,
    diaDelMes,
    mesDelAnio: mesDelAnio.nullable(),
    desde: FechaSchema,
    hasta: FechaSchema.nullable(),
    activa: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarRecurrencia = z.infer<typeof ActualizarRecurrenciaSchema>;

export const ListarRecurrenciasQuerySchema = z.object({
  /** Por defecto solo las activas. */
  incluirInactivas: BooleanoQuerySchema.default(false),
});
export type ListarRecurrenciasQuery = z.infer<typeof ListarRecurrenciasQuerySchema>;

export const RecurrenciaSchema = z.object({
  id: z.string(),
  tipo: TipoMovimientoSchema,
  monto: z.string(),
  moneda: MonedaSchema,
  descripcion: z.string(),
  frecuencia: FrecuenciaSchema,
  diaDelMes: z.number().int(),
  mesDelAnio: z.number().int().nullable(),
  desde: FechaSchema,
  hasta: FechaSchema.nullable(),
  activa: z.boolean(),
  cuenta: CuentaResumidaSchema,
  categoria: CategoriaResumidaSchema.nullable(),
  /** Próxima fecha en que se va a generar el movimiento; null si terminó o está inactiva. */
  proximaFecha: FechaSchema.nullable(),
  creadoEn: z.iso.datetime(),
});
export type Recurrencia = z.infer<typeof RecurrenciaSchema>;
