import { z } from 'zod';
import { MONEDAS } from '../dinero';
import { esFechaValida, esPeriodoValido } from '../fechas';

export const MonedaSchema = z.enum(MONEDAS);

export const PeriodoSchema = z
  .string()
  .refine(esPeriodoValido, { message: 'Período inválido (se espera YYYY-MM)' });

export const FechaSchema = z
  .string()
  .refine(esFechaValida, { message: 'Fecha inválida (se espera YYYY-MM-DD)' });

/**
 * Monto positivo como string decimal con hasta 2 decimales, sin signo ni separador
 * de miles: "1234.5". Hasta 16 dígitos enteros para entrar en `Decimal(18, 2)`.
 */
export const MontoSchema = z
  .string()
  .regex(/^\d{1,16}(\.\d{1,2})?$/, {
    message: 'Monto inválido (número positivo con hasta 2 decimales, ej. 1234.50)',
  })
  .refine((v) => !/^0+(\.0+)?$/.test(v), { message: 'El monto tiene que ser mayor a cero' });

/**
 * Importe con signo (puede ser cero o negativo), mismo formato que MontoSchema: "-1234.5".
 * Para saldos iniciales y aportes/retiros.
 */
export const ImporteSchema = z.string().regex(/^-?\d{1,16}(\.\d{1,2})?$/, {
  message: 'Importe inválido (número con hasta 2 decimales, ej. -1234.50)',
});

/** Color hexadecimal #RRGGBB (se guarda en mayúsculas). */
export const ColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, { message: 'Color inválido (se espera #RRGGBB)' })
  .transform((v) => v.toUpperCase());

/** Booleano en query string: "true"/"false" (también 1/0, yes/no). */
export const BooleanoQuerySchema = z.stringbool();

/** Id de un recurso (cuid). */
export const IdSchema = z.string().min(1).max(64);

/** Query de paginación por cursor. `limit` llega como string en la query y se convierte. */
export const PaginacionQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginacionQuery = z.infer<typeof PaginacionQuerySchema>;
