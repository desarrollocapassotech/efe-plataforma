import { z } from 'zod';
import { BooleanoQuerySchema, ColorSchema, IdSchema } from './base';

export const TIPOS_MOVIMIENTO = ['INGRESO', 'GASTO'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];
export const TipoMovimientoSchema = z.enum(TIPOS_MOVIMIENTO);

const nombre = z.string().trim().min(1, 'Poné un nombre').max(40);
/** Un emoji (algunos ocupan varios code points, como 🧑‍💻): se limita por largo, no por "1 caracter". */
const icono = z.string().trim().min(1, 'Elegí un ícono').max(16);

/** POST /categorias */
export const CrearCategoriaSchema = z.strictObject({
  tipo: TipoMovimientoSchema,
  nombre,
  color: ColorSchema,
  icono,
});
export type CrearCategoria = z.input<typeof CrearCategoriaSchema>;

/** PATCH /categorias/:id. El tipo no se cambia (rompería los movimientos ya cargados). */
export const ActualizarCategoriaSchema = z
  .strictObject({
    nombre,
    color: ColorSchema,
    icono,
    archivada: z.boolean(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarCategoria = z.infer<typeof ActualizarCategoriaSchema>;

/** PUT /categorias/orden: nuevo orden en lote. */
export const OrdenCategoriasSchema = z
  .array(z.strictObject({ id: IdSchema, orden: z.number().int().min(0).max(10_000) }))
  .min(1)
  .max(200)
  .refine((items) => new Set(items.map((i) => i.id)).size === items.length, {
    message: 'Hay categorías repetidas',
  });
export type OrdenCategorias = z.infer<typeof OrdenCategoriasSchema>;

/** GET /categorias */
export const ListarCategoriasQuerySchema = z.object({
  tipo: TipoMovimientoSchema.optional(),
  incluirArchivadas: BooleanoQuerySchema.default(false),
});
export type ListarCategoriasQuery = z.infer<typeof ListarCategoriasQuerySchema>;

export const CategoriaSchema = z.object({
  id: z.string(),
  tipo: TipoMovimientoSchema,
  nombre: z.string(),
  color: z.string(),
  icono: z.string(),
  esDefault: z.boolean(),
  archivada: z.boolean(),
  orden: z.number().int(),
});
export type Categoria = z.infer<typeof CategoriaSchema>;
