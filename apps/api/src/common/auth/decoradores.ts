import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Feature } from '@efe/shared/features';
import type { Rol } from '@prisma/client';
import type { RequestConUsuario, UsuarioActual } from './usuario-actual';

export const ES_PUBLICO = 'efe:publico';
export const ROLES_REQUERIDOS = 'efe:roles';
export const FEATURE_REQUERIDA = 'efe:feature';
export const PERMITE_CUENTA_ELIMINADA = 'efe:permite-eliminada';

/** El endpoint no requiere token. Todo lo demás es privado por default. */
export const Public = () => SetMetadata(ES_PUBLICO, true);

/**
 * El endpoint acepta usuarios con la cuenta dada de baja (dentro de los 30 días): solo para
 * ver el estado y recuperarla. El resto responde 403 CUENTA_ELIMINADA.
 */
export const PermitirCuentaEliminada = () => SetMetadata(PERMITE_CUENTA_ELIMINADA, true);

/** Solo usuarios con alguno de estos roles. 403 PROHIBIDO si no. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_REQUERIDOS, roles);

/** Solo si el plan del usuario incluye la feature. 403 FEATURE_NO_INCLUIDA si no. */
export const RequiresFeature = (feature: Feature) => SetMetadata(FEATURE_REQUERIDA, feature);

/** Usuario autenticado: { id, firebaseUid, email, rol, plan }. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioActual => {
    const usuario = ctx.switchToHttp().getRequest<RequestConUsuario>().user;
    if (!usuario) {
      // Solo pasa si se usa @CurrentUser() en un endpoint @Public(): error de programación.
      throw new Error('@CurrentUser() usado en un endpoint sin autenticación');
    }
    return usuario;
  },
);
