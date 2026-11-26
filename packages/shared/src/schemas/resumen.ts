import { z } from 'zod';
import { MonedaSchema, PeriodoSchema } from './base';

// Criterio caja (ARCHITECTURE §5.1, a validar con Flor): gastos del mes = movimientos de
// tipo GASTO con fecha en el mes + cuotas de tarjeta con periodoResumen = mes.
// Transferencias y pagos de resumen NO son ingreso ni gasto.

/** GET /resumen/mensual. Sin período, el mes actual (Argentina). */
export const ResumenMensualQuerySchema = z.object({
  periodo: PeriodoSchema.optional(),
});
export type ResumenMensualQuery = z.infer<typeof ResumenMensualQuerySchema>;

export const GastoPorCategoriaSchema = z.object({
  /** null = "Sin categoría". */
  categoriaId: z.string().nullable(),
  nombre: z.string(),
  color: z.string().nullable(),
  icono: z.string().nullable(),
  total: z.string(),
  /** Porcentaje sobre el total de gastos del mes ("57.14"). */
  porcentaje: z.string().nullable(),
});
export type GastoPorCategoria = z.infer<typeof GastoPorCategoriaSchema>;

export const ResumenMonedaSchema = z.object({
  moneda: MonedaSchema,
  ingresos: z.string(),
  /** gastosMovimientos + gastosTarjeta. */
  gastos: z.string(),
  /** ingresos − gastos del mes. */
  saldo: z.string(),
  /** gastos / ingresos en %, null si no hubo ingresos. */
  porcentajeGastado: z.string().nullable(),
  gastosMovimientos: z.string(),
  /** Cuotas de tarjeta con periodoResumen = el mes. */
  gastosTarjeta: z.string(),
  /** Solo gastos, de mayor a menor. Las cuotas suman a la categoría de su compra. */
  porCategoria: z.array(GastoPorCategoriaSchema),
  comparacionMesAnterior: z.object({
    ingresosAnterior: z.string(),
    gastosAnterior: z.string(),
    /** Variación % contra el mes anterior; null si el anterior fue cero. */
    variacionIngresos: z.string().nullable(),
    variacionGastos: z.string().nullable(),
  }),
});
export type ResumenMoneda = z.infer<typeof ResumenMonedaSchema>;

export const ResumenMensualSchema = z.object({
  periodo: PeriodoSchema,
  /** Una entrada por moneda con datos en el período (no se mezclan monedas). */
  monedas: z.array(ResumenMonedaSchema),
});
export type ResumenMensual = z.infer<typeof ResumenMensualSchema>;

/** GET /resumen/evolucion. Termina en `hasta` (default: mes actual) e incluye `meses` meses. */
export const EvolucionQuerySchema = z.object({
  meses: z.coerce.number().int().min(1).max(36).default(12),
  hasta: PeriodoSchema.optional(),
});
export type EvolucionQuery = z.infer<typeof EvolucionQuerySchema>;

export const PuntoEvolucionSchema = z.object({
  periodo: PeriodoSchema,
  ingresos: z.string(),
  gastos: z.string(),
  gastosMovimientos: z.string(),
  gastosTarjeta: z.string(),
  saldo: z.string(),
});
export type PuntoEvolucion = z.infer<typeof PuntoEvolucionSchema>;

export const EvolucionSchema = z.object({
  desde: PeriodoSchema,
  hasta: PeriodoSchema,
  /** Por moneda con datos en el rango; cada una con todos los meses (en cero si no hubo nada). */
  monedas: z.array(z.object({ moneda: MonedaSchema, meses: z.array(PuntoEvolucionSchema) })),
});
export type Evolucion = z.infer<typeof EvolucionSchema>;
