import {
  ActualizarMovimientoSchema,
  CrearMovimientoSchema,
  ListarMovimientosQuerySchema,
  MovimientoSchema,
  PaginaMovimientosSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearMovimientoDto extends createZodDto(CrearMovimientoSchema) {}
export class ActualizarMovimientoDto extends createZodDto(ActualizarMovimientoSchema) {}
export class ListarMovimientosQueryDto extends createZodDto(ListarMovimientosQuerySchema) {}
export class MovimientoDto extends createZodDto(MovimientoSchema) {}
export class PaginaMovimientosDto extends createZodDto(PaginaMovimientosSchema) {}
