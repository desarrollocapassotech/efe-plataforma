import {
  ActualizarCategoriaSchema,
  CategoriaSchema,
  CrearCategoriaSchema,
  ListarCategoriasQuerySchema,
  OrdenCategoriasSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearCategoriaDto extends createZodDto(CrearCategoriaSchema) {}
export class ActualizarCategoriaDto extends createZodDto(ActualizarCategoriaSchema) {}
export class ListarCategoriasQueryDto extends createZodDto(ListarCategoriasQuerySchema) {}
export class OrdenCategoriasDto extends createZodDto(OrdenCategoriasSchema) {}
export class CategoriaDto extends createZodDto(CategoriaSchema) {}
