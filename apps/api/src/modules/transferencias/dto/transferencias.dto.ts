import {
  ActualizarTransferenciaSchema,
  CrearTransferenciaSchema,
  ListarTransferenciasQuerySchema,
  PaginaTransferenciasSchema,
  TransferenciaSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearTransferenciaDto extends createZodDto(CrearTransferenciaSchema) {}
export class ActualizarTransferenciaDto extends createZodDto(ActualizarTransferenciaSchema) {}
export class ListarTransferenciasQueryDto extends createZodDto(ListarTransferenciasQuerySchema) {}
export class TransferenciaDto extends createZodDto(TransferenciaSchema) {}
export class PaginaTransferenciasDto extends createZodDto(PaginaTransferenciasSchema) {}
