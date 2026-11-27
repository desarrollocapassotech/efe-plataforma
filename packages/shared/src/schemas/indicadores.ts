import { z } from 'zod';
import { CODIGOS_INDICADOR } from '../indicadores';
import { FechaSchema } from './base';

export const CodigoIndicadorSchema = z.enum(CODIGOS_INDICADOR);

/** Último valor de un indicador, con el anterior para mostrar la variación. */
export const ValorIndicadorSchema = z.object({
  codigo: CodigoIndicadorSchema,
  /** Fecha a la que corresponde el dato (el IPC: primer día del mes). */
  fecha: FechaSchema,
  valor: z.string(),
  fuente: z.string(),
  urlFuente: z.string().nullable(),
  /** Cuándo lo trajimos de la fuente. */
  obtenidoEn: z.iso.datetime(),
  anterior: z.object({ fecha: FechaSchema, valor: z.string() }).nullable(),
  /** Variación % contra el anterior (dólares: día anterior; IPC: mes anterior). */
  variacion: z.string().nullable(),
});
export type ValorIndicador = z.infer<typeof ValorIndicadorSchema>;

const CalculadoSchema = z.object({ valor: z.string(), fecha: FechaSchema });

/** GET /indicadores (público). */
export const IndicadoresSchema = z.object({
  valores: z.array(ValorIndicadorSchema),
  /** MEP venta / oficial venta − 1, en %. */
  brechaMep: CalculadoSchema.nullable(),
  /** CCL venta / oficial venta − 1, en %. */
  brechaCcl: CalculadoSchema.nullable(),
  /** IPC acumulado del año del último dato (enero a ese mes), en %. */
  ipcAcumuladoAnio: CalculadoSchema.extend({ meses: z.number().int() }).nullable(),
});
export type Indicadores = z.infer<typeof IndicadoresSchema>;

/** GET /indicadores/:codigo/historico. Sin rango: los últimos 90 días (IPC: 24 meses). */
export const HistoricoQuerySchema = z
  .object({ desde: FechaSchema.optional(), hasta: FechaSchema.optional() })
  .refine((d) => !d.desde || !d.hasta || d.desde <= d.hasta, {
    message: '"desde" no puede ser posterior a "hasta"',
    path: ['desde'],
  });
export type HistoricoQuery = z.infer<typeof HistoricoQuerySchema>;

export const PuntoIndicadorSchema = z.object({
  fecha: FechaSchema,
  valor: z.string(),
  fuente: z.string(),
});

export const HistoricoSchema = z.object({
  codigo: CodigoIndicadorSchema,
  puntos: z.array(PuntoIndicadorSchema),
});
export type Historico = z.infer<typeof HistoricoSchema>;

// --- Admin ---------------------------------------------------------------------------

export const ListarIndicadoresAdminQuerySchema = z.object({
  codigo: CodigoIndicadorSchema.optional(),
  desde: FechaSchema.optional(),
  hasta: FechaSchema.optional(),
});
export type ListarIndicadoresAdminQuery = z.infer<typeof ListarIndicadoresAdminQuerySchema>;

/** PUT /admin/indicadores: corrige (o carga) a mano el valor de un día. */
export const CorregirIndicadorSchema = z.strictObject({
  codigo: CodigoIndicadorSchema,
  fecha: FechaSchema,
  valor: z.string().regex(/^-?\d{1,12}(\.\d{1,6})?$/, {
    message: 'Valor inválido (número con hasta 6 decimales)',
  }),
});
export type CorregirIndicador = z.infer<typeof CorregirIndicadorSchema>;

export const IndicadorAdminSchema = z.object({
  id: z.string(),
  codigo: CodigoIndicadorSchema,
  fecha: FechaSchema,
  valor: z.string(),
  fuente: z.string(),
  urlFuente: z.string().nullable(),
  obtenidoEn: z.iso.datetime(),
});
export type IndicadorAdmin = z.infer<typeof IndicadorAdminSchema>;
