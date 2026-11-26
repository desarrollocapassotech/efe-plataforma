import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Feature, tieneFeature } from '@efe/shared/features';
import type { Rol } from '@prisma/client';
import type { RequestConUsuario } from './usuario-actual';
import { AppException } from '../errors/app.exception';
import { FEATURE_REQUERIDA, ROLES_REQUERIDOS } from './decoradores';

function metadato<T>(
  reflector: Reflector,
  clave: string,
  context: ExecutionContext,
): T | undefined {
  return reflector.getAllAndOverride<T>(clave, [context.getHandler(), context.getClass()]);
}

/** @Roles(...): corre después de FirebaseAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = metadato<Rol[]>(this.reflector, ROLES_REQUERIDOS, context);
    if (!roles?.length) return true;
    const usuario = context.switchToHttp().getRequest<RequestConUsuario>().user;
    if (usuario && roles.includes(usuario.rol)) return true;
    throw new AppException('PROHIBIDO', 'No tenés permisos para esta acción', HttpStatus.FORBIDDEN);
  }
}

/** @RequiresFeature(...): el plan del usuario tiene que incluir la feature. */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = metadato<Feature>(this.reflector, FEATURE_REQUERIDA, context);
    if (!feature) return true;
    const usuario = context.switchToHttp().getRequest<RequestConUsuario>().user;
    if (usuario && tieneFeature(usuario.plan, feature)) return true;
    throw new AppException(
      'FEATURE_NO_INCLUIDA',
      'Esta funcionalidad no está incluida en tu plan',
      HttpStatus.FORBIDDEN,
      { feature },
    );
  }
}
