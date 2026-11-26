import { Injectable } from '@nestjs/common';
import { FEATURES_POR_PLAN } from '@efe/shared/features';
import type { ActualizarMe, Me } from '@efe/shared/schemas';
import type { Usuario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function aMe(usuario: Usuario): Me {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
    plan: usuario.plan,
    monedaPrincipal: usuario.monedaPrincipal,
    onboardingCompletado: usuario.onboardingCompletado,
    features: [...FEATURES_POR_PLAN[usuario.plan]],
    creadoEn: usuario.creadoEn.toISOString(),
  };
}

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerMe(usuarioId: string): Promise<Me> {
    return aMe(await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } }));
  }

  async actualizarMe(usuarioId: string, datos: ActualizarMe): Promise<Me> {
    return aMe(await this.prisma.usuario.update({ where: { id: usuarioId }, data: datos }));
  }
}
