import {
  CambiarPlanSchema,
  ListarAuditoriaQuerySchema,
  ListarUsuariosAdminQuerySchema,
  MetricasSchema,
  PaginaAuditoriaSchema,
  PaginaUsuariosAdminSchema,
  UsuarioAdminDetalleSchema,
  UsuarioAdminSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class ListarUsuariosAdminQueryDto extends createZodDto(ListarUsuariosAdminQuerySchema) {}
export class PaginaUsuariosAdminDto extends createZodDto(PaginaUsuariosAdminSchema) {}
export class UsuarioAdminDto extends createZodDto(UsuarioAdminSchema) {}
export class UsuarioAdminDetalleDto extends createZodDto(UsuarioAdminDetalleSchema) {}
export class CambiarPlanDto extends createZodDto(CambiarPlanSchema) {}
export class MetricasDto extends createZodDto(MetricasSchema) {}
export class ListarAuditoriaQueryDto extends createZodDto(ListarAuditoriaQuerySchema) {}
export class PaginaAuditoriaDto extends createZodDto(PaginaAuditoriaSchema) {}
