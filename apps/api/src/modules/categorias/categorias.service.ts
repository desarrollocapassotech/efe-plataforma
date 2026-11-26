import { Injectable } from '@nestjs/common';
import type {
  ActualizarCategoria,
  Categoria,
  CrearCategoria,
  ListarCategoriasQuery,
  OrdenCategorias,
  TipoMovimiento,
} from '@efe/shared/schemas';
import { Prisma, type Categoria as CategoriaDb } from '@prisma/client';
import { conflicto, noEncontrado } from '../../common/errors/errores';
import { PrismaService } from '../../prisma/prisma.service';

function aCategoria(c: CategoriaDb): Categoria {
  return {
    id: c.id,
    tipo: c.tipo,
    nombre: c.nombre,
    color: c.color,
    icono: c.icono,
    esDefault: c.esDefault,
    archivada: c.archivada,
    orden: c.orden,
  };
}

const duplicada = () => conflicto('CATEGORIA_DUPLICADA', 'Ya tenés una categoría con ese nombre');

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    usuarioId: string,
    { tipo, incluirArchivadas }: ListarCategoriasQuery,
  ): Promise<Categoria[]> {
    const categorias = await this.prisma.categoria.findMany({
      where: {
        usuarioId,
        ...(tipo ? { tipo } : {}),
        ...(incluirArchivadas ? {} : { archivada: false }),
      },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { nombre: 'asc' }],
    });
    return categorias.map(aCategoria);
  }

  async crear(usuarioId: string, datos: CrearCategoria): Promise<Categoria> {
    await this.verificarNombreLibre(usuarioId, datos.tipo, datos.nombre);
    const { _max } = await this.prisma.categoria.aggregate({
      where: { usuarioId, tipo: datos.tipo },
      _max: { orden: true },
    });
    try {
      const categoria = await this.prisma.categoria.create({
        data: { ...datos, usuarioId, orden: (_max.orden ?? -1) + 1 },
      });
      return aCategoria(categoria);
    } catch (error) {
      throw this.traducirDuplicado(error);
    }
  }

  async actualizar(usuarioId: string, id: string, datos: ActualizarCategoria): Promise<Categoria> {
    const categoria = await this.obtenerPropia(usuarioId, id);
    if (datos.nombre !== undefined) {
      await this.verificarNombreLibre(usuarioId, categoria.tipo, datos.nombre, id);
    }
    try {
      return aCategoria(await this.prisma.categoria.update({ where: { id }, data: datos }));
    } catch (error) {
      throw this.traducirDuplicado(error);
    }
  }

  async borrar(usuarioId: string, id: string): Promise<void> {
    await this.obtenerPropia(usuarioId, id);
    const { _count } = await this.prisma.categoria.findUniqueOrThrow({
      where: { id },
      select: { _count: { select: { movimientos: true, recurrencias: true, compras: true } } },
    });
    if (Object.values(_count).some((n) => n > 0)) {
      throw conflicto(
        'CATEGORIA_EN_USO',
        'La categoría se usa en movimientos, recurrencias o compras. Podés archivarla.',
      );
    }
    await this.prisma.categoria.delete({ where: { id } });
  }

  /** Reordena en lote. Todas las categorías tienen que ser del usuario (si no, 404). */
  async ordenar(usuarioId: string, items: OrdenCategorias): Promise<void> {
    const ids = items.map((i) => i.id);
    const propias = await this.prisma.categoria.count({ where: { usuarioId, id: { in: ids } } });
    if (propias !== ids.length) throw noEncontrado('No encontramos alguna de las categorías');
    await this.prisma.$transaction(
      items.map(({ id, orden }) =>
        this.prisma.categoria.update({ where: { id }, data: { orden } }),
      ),
    );
  }

  /** Categoría del usuario o 404 (también si es de otro usuario). */
  async obtenerPropia(usuarioId: string, id: string): Promise<CategoriaDb> {
    const categoria = await this.prisma.categoria.findFirst({ where: { id, usuarioId } });
    if (!categoria) throw noEncontrado('No encontramos la categoría');
    return categoria;
  }

  /** Nombre único por usuario y tipo, sin distinguir mayúsculas ("Café" = "café"). */
  private async verificarNombreLibre(
    usuarioId: string,
    tipo: TipoMovimiento,
    nombre: string,
    excluirId?: string,
  ): Promise<void> {
    const existente = await this.prisma.categoria.findFirst({
      where: {
        usuarioId,
        tipo,
        nombre: { equals: nombre, mode: 'insensitive' },
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { id: true },
    });
    if (existente) throw duplicada();
  }

  /** Carrera entre la verificación y el insert: el unique de la base lo frena. */
  private traducirDuplicado(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return duplicada();
    }
    return error;
  }
}
