import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Acciones auditadas (ARCHITECTURE §9). Códigos estables: los usa el admin para filtrar. */
export type AccionAuditada =
  | 'cuenta.eliminar'
  | 'cuenta.restaurar'
  | 'cuenta.purgar'
  | 'usuario.exportar'
  | 'usuario.aceptar_terminos'
  | 'admin.cambiar_plan'
  | 'admin.corregir_indicador'
  | 'admin.vincular_cliente';

export interface RegistroAuditoria {
  accion: AccionAuditada;
  entidad: string;
  entidadId?: string | null;
  /** Usuario afectado. */
  usuarioId?: string | null;
  /** Quién lo hizo (el mismo usuario, un admin o null si fue un job). */
  actorId?: string | null;
  datos?: Prisma.InputJsonValue;
  ip?: string | null;
}

type Cliente = Pick<Prisma.TransactionClient, 'auditoria'>;

/** Un solo lugar para escribir en `auditoria` (dentro de la transacción de la acción, si hay). */
@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(r: RegistroAuditoria, cliente: Cliente = this.prisma): Promise<void> {
    await cliente.auditoria.create({
      data: {
        accion: r.accion,
        entidad: r.entidad,
        entidadId: r.entidadId ?? null,
        usuarioId: r.usuarioId ?? null,
        actorId: r.actorId ?? null,
        datos: r.datos,
        ip: r.ip ?? null,
      },
    });
  }
}
