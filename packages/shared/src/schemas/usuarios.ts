import { z } from 'zod';
import { FEATURES, PLANES } from '../features';
import { MonedaSchema } from './base';

export const ROLES = ['USUARIO', 'ADMIN'] as const;
export type Rol = (typeof ROLES)[number];

export const RolSchema = z.enum(ROLES);
export const PlanSchema = z.enum(PLANES);
export const FeatureSchema = z.enum(FEATURES);

/** PATCH /me. Solo lo que el usuario puede cambiar de sí mismo (nunca rol ni plan). */
export const ActualizarMeSchema = z
  .strictObject({
    nombre: z.string().trim().min(1, 'El nombre no puede estar vacío').max(80).nullable(),
    monedaPrincipal: MonedaSchema,
    onboardingCompletado: z.boolean(),
  })
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, {
    message: 'Mandá al menos un campo para actualizar',
  });

export type ActualizarMe = z.infer<typeof ActualizarMeSchema>;

/** Respuesta de GET /me y PATCH /me. */
export const MeSchema = z.object({
  id: z.string(),
  email: z.string(),
  nombre: z.string().nullable(),
  rol: RolSchema,
  plan: PlanSchema,
  monedaPrincipal: MonedaSchema,
  onboardingCompletado: z.boolean(),
  features: z.array(FeatureSchema),
  creadoEn: z.iso.datetime(),
  /** Versión de términos y privacidad aceptada (null: todavía no aceptó ninguna). */
  terminosVersion: z.string().nullable(),
  terminosAceptadosEn: z.iso.datetime().nullable(),
});

export type Me = z.infer<typeof MeSchema>;

/**
 * Versión vigente de los términos y la política de privacidad. Si cambia, la web vuelve a
 * pedir la aceptación. Los textos son placeholders hasta que EFE entregue los definitivos.
 */
export const TERMINOS_VERSION = '2026-11-borrador';

/** POST /me/terminos: acepta la versión vigente. */
export const AceptarTerminosSchema = z.strictObject({
  version: z.literal(TERMINOS_VERSION, { message: 'Esa no es la versión vigente de los términos' }),
});
export type AceptarTerminos = z.infer<typeof AceptarTerminosSchema>;

/** DELETE /me: hay que escribir ELIMINAR para confirmar. */
export const EliminarCuentaSchema = z.strictObject({
  confirmacion: z.literal('ELIMINAR', { message: 'Escribí ELIMINAR para confirmar' }),
});
export type EliminarCuenta = z.infer<typeof EliminarCuentaSchema>;

/** Días entre la baja y el borrado definitivo (se puede recuperar la cuenta en ese plazo). */
export const DIAS_PARA_PURGAR = 30;
