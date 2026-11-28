import { z } from 'zod';

// Schemas de formularios de auth. No son de la API (estos datos van a Firebase),
// por eso viven en la web y no en @efe/shared.

const email = z.email('Ingresá un email válido').trim().toLowerCase();

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Ingresá tu contraseña'),
});
export type LoginForm = z.infer<typeof LoginSchema>;

export const RegistroSchema = z
  .object({
    email,
    password: z
      .string()
      .min(8, 'Usá al menos 8 caracteres')
      .max(128, 'Usá como máximo 128 caracteres'),
    confirmacion: z.string(),
    acepto: z.boolean().refine((v) => v, 'Para crear la cuenta tenés que aceptar los términos'),
  })
  .refine((d) => d.password === d.confirmacion, {
    path: ['confirmacion'],
    message: 'Las contraseñas no coinciden',
  });
export type RegistroForm = z.infer<typeof RegistroSchema>;

export const RecuperarSchema = z.object({ email });
export type RecuperarForm = z.infer<typeof RecuperarSchema>;
