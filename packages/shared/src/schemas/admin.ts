import { z } from 'zod';
import { FechaSchema, IdSchema, MonedaSchema } from './base';
import { PlanSchema, RolSchema } from './usuarios';

// Endpoints del admin (@Roles('ADMIN')). Paginación por página (no por cursor): las
// tablas del admin ordenan por columna y muestran el total.

const pagina = {
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
};
const direccion = z.enum(['asc', 'desc']);

export function paginaAdminSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    pagina: z.number().int(),
    limite: z.number().int(),
  });
}
export interface PaginaAdmin<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
}

const rangoValido = (d: { desde?: string; hasta?: string }) =>
  !d.desde || !d.hasta || d.desde <= d.hasta;

// --- Usuarios de la plataforma ---------------------------------------------------------

export const ORDEN_USUARIOS = ['creadoEn', 'ultimoAccesoEn', 'email', 'nombre', 'plan'] as const;

/** GET /admin/usuarios */
export const ListarUsuariosAdminQuerySchema = z
  .object({
    /** Búsqueda en email o nombre, sin distinguir mayúsculas. */
    q: z.string().trim().min(1).max(100).optional(),
    plan: PlanSchema.optional(),
    rol: RolSchema.optional(),
    /** Con acceso en los últimos N días. */
    activoDias: z.coerce.number().int().min(1).max(365).optional(),
    desde: FechaSchema.optional(),
    hasta: FechaSchema.optional(),
    incluirEliminados: z.stringbool().default(false),
    orden: z.enum(ORDEN_USUARIOS).default('creadoEn'),
    dir: direccion.default('desc'),
    ...pagina,
  })
  .refine(rangoValido, { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] });
export type ListarUsuariosAdminQuery = z.infer<typeof ListarUsuariosAdminQuerySchema>;

export const UsuarioAdminSchema = z.object({
  id: z.string(),
  email: z.string(),
  nombre: z.string().nullable(),
  rol: RolSchema,
  plan: PlanSchema,
  onboardingCompletado: z.boolean(),
  creadoEn: z.iso.datetime(),
  ultimoAccesoEn: z.iso.datetime().nullable(),
  eliminadoEn: z.iso.datetime().nullable(),
  /** Cantidad de movimientos cargados (sin montos: privacidad). */
  movimientos: z.number().int(),
});
export type UsuarioAdmin = z.infer<typeof UsuarioAdminSchema>;

export const PaginaUsuariosAdminSchema = paginaAdminSchema(UsuarioAdminSchema);

/** GET /admin/usuarios/:id: solo contadores, nunca datos financieros (privacidad). */
export const UsuarioAdminDetalleSchema = UsuarioAdminSchema.extend({
  monedaPrincipal: MonedaSchema,
  contadores: z.object({
    cuentas: z.number().int(),
    movimientos: z.number().int(),
    recurrencias: z.number().int(),
    tarjetas: z.number().int(),
    compras: z.number().int(),
    objetivos: z.number().int(),
  }),
});
export type UsuarioAdminDetalle = z.infer<typeof UsuarioAdminDetalleSchema>;

/** PATCH /admin/usuarios/:id/plan (auditado). */
export const CambiarPlanSchema = z.strictObject({
  plan: PlanSchema,
  motivo: z.string().trim().max(300).optional(),
});
export type CambiarPlan = z.infer<typeof CambiarPlanSchema>;

// --- Métricas --------------------------------------------------------------------------

const PuntoDiarioSchema = z.object({ fecha: FechaSchema, cantidad: z.number().int() });

/**
 * GET /admin/metricas. Cuenta usuarios de la plataforma: sin administradores ni cuentas
 * eliminadas. Los días son de Argentina.
 */
export const MetricasSchema = z.object({
  totalUsuarios: z.number().int(),
  activos7: z.number().int(),
  activos30: z.number().int(),
  conMovimientos: z.number().int(),
  /** % con el onboarding completo (null sin usuarios). */
  onboardingCompletado: z.string().nullable(),
  registrosPorDia: z.array(PuntoDiarioSchema),
  movimientosPorDia: z.array(PuntoDiarioSchema),
  usoModulos: z.object({
    conTarjetas: z.number().int(),
    conObjetivos: z.number().int(),
    conRecurrencias: z.number().int(),
  }),
});
export type Metricas = z.infer<typeof MetricasSchema>;

// --- Auditoría -------------------------------------------------------------------------

/** GET /admin/auditoria */
export const ListarAuditoriaQuerySchema = z
  .object({
    accion: z.string().trim().min(1).max(100).optional(),
    /** Usuario afectado o actor. */
    usuarioId: IdSchema.optional(),
    desde: FechaSchema.optional(),
    hasta: FechaSchema.optional(),
    dir: direccion.default('desc'),
    ...pagina,
  })
  .refine(rangoValido, { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] });
export type ListarAuditoriaQuery = z.infer<typeof ListarAuditoriaQuerySchema>;

const PersonaSchema = z.object({ id: z.string(), email: z.string() }).nullable();

export const AuditoriaItemSchema = z.object({
  id: z.string(),
  accion: z.string(),
  entidad: z.string(),
  entidadId: z.string().nullable(),
  usuario: PersonaSchema,
  actor: PersonaSchema,
  datos: z.unknown(),
  ip: z.string().nullable(),
  creadoEn: z.iso.datetime(),
});
export type AuditoriaItem = z.infer<typeof AuditoriaItemSchema>;

export const PaginaAuditoriaSchema = paginaAdminSchema(AuditoriaItemSchema);
