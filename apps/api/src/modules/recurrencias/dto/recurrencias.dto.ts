import {
  ActualizarRecurrenciaSchema,
  CrearRecurrenciaSchema,
  ListarRecurrenciasQuerySchema,
  RecurrenciaSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearRecurrenciaDto extends createZodDto(CrearRecurrenciaSchema) {}
export class ActualizarRecurrenciaDto extends createZodDto(ActualizarRecurrenciaSchema) {}
export class ListarRecurrenciasQueryDto extends createZodDto(ListarRecurrenciasQuerySchema) {}
export class RecurrenciaDto extends createZodDto(RecurrenciaSchema) {}
