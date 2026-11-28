import {
  AceptarTerminosSchema,
  ActualizarMeSchema,
  EliminarCuentaSchema,
  MeSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class ActualizarMeDto extends createZodDto(ActualizarMeSchema) {}
export class MeDto extends createZodDto(MeSchema) {}
export class AceptarTerminosDto extends createZodDto(AceptarTerminosSchema) {}
export class EliminarCuentaDto extends createZodDto(EliminarCuentaSchema) {}
