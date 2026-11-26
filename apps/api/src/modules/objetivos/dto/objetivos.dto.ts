import {
  ActualizarObjetivoSchema,
  AporteSchema,
  CrearAporteSchema,
  CrearObjetivoSchema,
  ObjetivoDetalleSchema,
  ObjetivoSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearObjetivoDto extends createZodDto(CrearObjetivoSchema) {}
export class ActualizarObjetivoDto extends createZodDto(ActualizarObjetivoSchema) {}
export class CrearAporteDto extends createZodDto(CrearAporteSchema) {}
export class ObjetivoDto extends createZodDto(ObjetivoSchema) {}
export class ObjetivoDetalleDto extends createZodDto(ObjetivoDetalleSchema) {}
export class AporteDto extends createZodDto(AporteSchema) {}
