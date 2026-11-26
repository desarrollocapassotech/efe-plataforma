import {
  ActualizarCuentaSchema,
  CrearCuentaSchema,
  CuentaSchema,
  ListarCuentasQuerySchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearCuentaDto extends createZodDto(CrearCuentaSchema) {}
export class ActualizarCuentaDto extends createZodDto(ActualizarCuentaSchema) {}
export class ListarCuentasQueryDto extends createZodDto(ListarCuentasQuerySchema) {}
export class CuentaDto extends createZodDto(CuentaSchema) {}
