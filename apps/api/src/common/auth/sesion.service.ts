import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type Usuario } from '@prisma/client';
import { categoriasDefaultPara } from '../../modules/categorias/plantilla';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../errors/app.exception';
import type { IdentidadToken } from './verificador-token';
import type { UsuarioActual } from './usuario-actual';

const UNA_HORA_MS = 60 * 60 * 1000;

/** Convierte una identidad verificada de Firebase en el Usuario de la plataforma. */
@Injectable()
export class SesionService {
  constructor(private readonly prisma: PrismaService) {}

  async resolver(identidad: IdentidadToken, ahora = new Date()): Promise<UsuarioActual> {
    const usuario = await this.obtenerOCrear(identidad);

    if (usuario.eliminadoEn) {
      throw new AppException(
        'CUENTA_ELIMINADA',
        'Tu cuenta está programada para eliminarse',
        HttpStatus.FORBIDDEN,
      );
    }

    const datos: Prisma.UsuarioUpdateInput = {};
    if (
      !usuario.ultimoAccesoEn ||
      ahora.getTime() - usuario.ultimoAccesoEn.getTime() >= UNA_HORA_MS
    ) {
      datos.ultimoAccesoEn = ahora;
    }
    // Si cambió el email en Firebase, se sincroniza.
    if (identidad.email && identidad.email !== usuario.email) datos.email = identidad.email;
    const actualizado =
      Object.keys(datos).length > 0
        ? await this.prisma.usuario.update({ where: { id: usuario.id }, data: datos })
        : usuario;

    return {
      id: actualizado.id,
      firebaseUid: actualizado.firebaseUid,
      email: actualizado.email,
      rol: actualizado.rol,
      plan: actualizado.plan,
    };
  }

  private async obtenerOCrear({ firebaseUid, email }: IdentidadToken): Promise<Usuario> {
    const existente = await this.prisma.usuario.findUnique({ where: { firebaseUid } });
    if (existente) return existente;

    if (!email) {
      throw new AppException(
        'TOKEN_SIN_EMAIL',
        'La cuenta de Firebase no tiene email',
        HttpStatus.UNAUTHORIZED,
      );
    }
    try {
      // Usuario nuevo: se crea junto con sus categorías default, todo o nada.
      return await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({ data: { firebaseUid, email } });
        await tx.categoria.createMany({ data: categoriasDefaultPara(usuario.id) });
        return usuario;
      });
    } catch (error) {
      // Dos requests simultáneos del mismo usuario nuevo: el segundo pierde la carrera.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.usuario.findUniqueOrThrow({ where: { firebaseUid } });
      }
      throw error;
    }
  }
}
