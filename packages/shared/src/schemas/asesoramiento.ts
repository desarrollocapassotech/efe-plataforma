import { z } from 'zod';
import { IdSchema, ImporteSchema, MontoSchema, PeriodoSchema } from './base';

// Asesoramiento (Fase 11, ARCHITECTURE §5.3): endpoints /admin/asesoramiento/*, solo ADMIN.

export const PERFILES_RIESGO = ['CONSERVADOR', 'MODERADO', 'AGRESIVO'] as const;
export const PerfilRiesgoSchema = z.enum(PERFILES_RIESGO);
export type PerfilRiesgo = z.infer<typeof PerfilRiesgoSchema>;

export const CONDICIONES_IVA = [
  'RESPONSABLE_INSCRIPTO',
  'EXENTO',
  'CONSUMIDOR_FINAL',
  'MONOTRIBUTO',
  'NO_CATEGORIZADO',
  'PROVEEDOR_EXTERIOR',
  'CLIENTE_EXTERIOR',
  'IVA_LIBERADO',
  'MONOTRIBUTO_SOCIAL',
  'NO_ALCANZADO',
  'MONOTRIBUTO_TIP',
] as const;

/** Datos fiscales para facturar con Faktia (cliente o broker). */
export const FiscalSchema = z.strictObject({
  tipoDocumento: z.enum(['CUIT', 'CUIL', 'DNI', 'PASAPORTE']),
  numeroDocumento: z.string().trim().min(1).max(20),
  condicionIva: z.enum(CONDICIONES_IVA),
  razonSocial: z.string().trim().max(200).optional(),
  domicilio: z.string().trim().max(300).optional(),
});
export type Fiscal = z.infer<typeof FiscalSchema>;

export const NotaClienteSchema = z.strictObject({
  texto: z.string().trim().min(1).max(5000),
  fecha: z.iso.datetime(),
});

const texto = (max: number) => z.string().trim().max(max);
const opcional = (max: number) => texto(max).nullable().optional();

// --- Clientes ---------------------------------------------------------------------------

export const CrearClienteSchema = z.strictObject({
  nombre: texto(80).min(1, 'Poné el nombre'),
  apellido: texto(80).min(1, 'Poné el apellido'),
  email: z.email().nullable().optional(),
  telefono: opcional(40),
  perfilInversor: PerfilRiesgoSchema.nullable().optional(),
  objetivos: opcional(2000),
  horizonteInversion: opcional(200),
  fiscal: FiscalSchema.nullable().optional(),
  notas: z.array(NotaClienteSchema).max(500).optional(),
  ultimoContacto: z.iso.datetime().nullable().optional(),
  brokerIds: z.array(IdSchema).max(20).default([]),
});
export type CrearCliente = z.input<typeof CrearClienteSchema>;

export const ActualizarClienteSchema = CrearClienteSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Mandá al menos un campo para actualizar' },
);
export type ActualizarCliente = z.input<typeof ActualizarClienteSchema>;

export const ListarClientesQuerySchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  estado: z.enum(['habilitados', 'deshabilitados', 'todos']).default('habilitados'),
  brokerId: IdSchema.optional(),
  planId: IdSchema.optional(),
  perfil: PerfilRiesgoSchema.optional(),
});
export type ListarClientesQuery = z.infer<typeof ListarClientesQuerySchema>;

/** Baja lógica: nunca se borra. Por defecto también da de baja la suscripción (mes vencido). */
export const DeshabilitarClienteSchema = z.strictObject({
  motivo: texto(300).optional(),
  darDeBajaSuscripcion: z.boolean().default(true),
});
export type DeshabilitarCliente = z.input<typeof DeshabilitarClienteSchema>;

/** Monto con vigencia: no negativo (0 = sin cobro ese período). */
const MontoVigenteSchema = z.strictObject({
  monto: ImporteSchema.refine((v) => !v.startsWith('-'), { message: 'No puede ser negativo' }),
  desde: PeriodoSchema,
});

/** PUT /clientes/:id/suscripcion: la suscripción completa (alta, baja, plan e historial). */
export const SuscripcionClienteSchema = z.strictObject({
  planId: IdSchema.nullable(),
  desde: PeriodoSchema,
  hasta: PeriodoSchema.nullable(),
  historial: z.array(MontoVigenteSchema).min(1).max(240),
});
export type SuscripcionCliente = z.infer<typeof SuscripcionClienteSchema>;

/** Vincula (o desvincula, con null) el cliente con un usuario de la plataforma. */
export const VincularUsuarioSchema = z.strictObject({ usuarioId: IdSchema.nullable() });
export type VincularUsuario = z.infer<typeof VincularUsuarioSchema>;

const Resumida = z.object({ id: z.string(), nombre: z.string() });

export const ClienteAsesoramientoSchema = z.object({
  id: z.string(),
  faktiaReferencia: z.string(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  perfilInversor: PerfilRiesgoSchema.nullable(),
  objetivos: z.string().nullable(),
  horizonteInversion: z.string().nullable(),
  fiscal: FiscalSchema.nullable(),
  notas: z.array(NotaClienteSchema),
  ultimoContacto: z.iso.datetime().nullable(),
  deshabilitadoEn: z.iso.datetime().nullable(),
  motivoDeshabilitacion: z.string().nullable(),
  creadoEn: z.iso.datetime(),
  brokers: z.array(Resumida),
  usuario: z.object({ id: z.string(), email: z.string() }).nullable(),
  suscripcion: SuscripcionClienteSchema.extend({
    plan: Resumida.nullable(),
    /** Monto del mes en curso. */
    montoActual: z.string().nullable(),
    activa: z.boolean(),
    /** Paga menos que el precio vigente de su plan. */
    atrasado: z.boolean(),
  }).nullable(),
});
export type ClienteAsesoramiento = z.infer<typeof ClienteAsesoramientoSchema>;

// --- Brokers, planes y servicios --------------------------------------------------------

export const CrearBrokerSchema = z.strictObject({
  nombre: texto(80).min(1, 'Poné el nombre'),
  email: z.email().nullable().optional(),
  telefono: opcional(40),
  notas: opcional(2000),
  fiscal: FiscalSchema.nullable().optional(),
});
export type CrearBroker = z.infer<typeof CrearBrokerSchema>;
export const ActualizarBrokerSchema = CrearBrokerSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'Mandá al menos un campo para actualizar' },
);
export type ActualizarBroker = z.infer<typeof ActualizarBrokerSchema>;

export const BrokerAsesoramientoSchema = z.object({
  id: z.string(),
  faktiaReferencia: z.string(),
  nombre: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  notas: z.string().nullable(),
  fiscal: FiscalSchema.nullable(),
  clientes: z.number().int(),
});
export type BrokerAsesoramiento = z.infer<typeof BrokerAsesoramientoSchema>;

/** Plan (suscripción mensual) o servicio (pago único): nombre y precio. */
export const CrearItemPrecioSchema = z.strictObject({
  nombre: texto(120).min(1, 'Poné el nombre'),
  precio: MontoSchema,
});
export type CrearItemPrecio = z.infer<typeof CrearItemPrecioSchema>;
export const ActualizarItemPrecioSchema = z
  .strictObject({ nombre: texto(120).min(1), precio: MontoSchema })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mandá al menos un campo para actualizar' });
export type ActualizarItemPrecio = z.infer<typeof ActualizarItemPrecioSchema>;

export const PlanAsesoramientoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  precio: z.string(),
  /** Clientes con suscripción activa en este plan. */
  clientes: z.number().int(),
});
export type PlanAsesoramiento = z.infer<typeof PlanAsesoramientoSchema>;

export const ServicioAsesoramientoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  precio: z.string(),
});
export type ServicioAsesoramiento = z.infer<typeof ServicioAsesoramientoSchema>;

/** POST /planes/:id/asignar: asigna el plan a varios clientes (alta o cambio de plan). */
export const AsignarPlanSchema = z.strictObject({
  clienteIds: z.array(IdSchema).min(1).max(500),
  /** A los que ya tienen suscripción, aplicarles el precio del plan desde el mes en curso. */
  aplicarPrecio: z.boolean().default(false),
});
export type AsignarPlan = z.input<typeof AsignarPlanSchema>;

/** POST /planes/:id/precio: nuevo precio, aplicado solo a los clientes indicados. */
export const ActualizarPrecioPlanSchema = z.strictObject({
  precio: MontoSchema,
  clienteIds: z.array(IdSchema).max(500).default([]),
});
export type ActualizarPrecioPlan = z.input<typeof ActualizarPrecioPlanSchema>;

export const ResultadoLoteSchema = z.object({
  actualizados: z.array(z.string()),
  omitidos: z.array(z.object({ id: z.string(), motivo: z.string() })),
});
export type ResultadoLote = z.infer<typeof ResultadoLoteSchema>;
