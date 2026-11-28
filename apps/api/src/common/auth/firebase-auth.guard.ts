import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RequestConUsuario } from './usuario-actual';
import { AppException } from '../errors/app.exception';
import { ES_PUBLICO, PERMITE_CUENTA_ELIMINADA } from './decoradores';
import { SesionService } from './sesion.service';
import { VerificadorToken } from './verificador-token';

/** Guard global: todo endpoint requiere `Authorization: Bearer <idToken>` salvo @Public(). */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verificador: VerificadorToken,
    private readonly sesion: SesionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) return true;

    const req = context.switchToHttp().getRequest<RequestConUsuario>();
    const [esquema, token] = (req.headers.authorization ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) {
      throw new AppException('NO_AUTENTICADO', 'Falta el token de acceso', HttpStatus.UNAUTHORIZED);
    }

    let identidad;
    try {
      identidad = await this.verificador.verificar(token);
    } catch {
      throw new AppException(
        'TOKEN_INVALIDO',
        'El token de acceso no es válido o venció',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const permiteEliminada = this.reflector.getAllAndOverride<boolean>(PERMITE_CUENTA_ELIMINADA, [
      context.getHandler(),
      context.getClass(),
    ]);
    req.user = await this.sesion.resolver(identidad, new Date(), { permiteEliminada });
    return true;
  }
}
