import type { Plan, Rol } from '@prisma/client';
import type { Request } from 'express';

/** Lo que queda en req.user y devuelve @CurrentUser(). */
export interface UsuarioActual {
  id: string;
  firebaseUid: string;
  email: string;
  rol: Rol;
  plan: Plan;
}

export type RequestConUsuario = Request & { user?: UsuarioActual };
