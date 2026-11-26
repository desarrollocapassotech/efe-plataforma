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
});

export type Me = z.infer<typeof MeSchema>;
