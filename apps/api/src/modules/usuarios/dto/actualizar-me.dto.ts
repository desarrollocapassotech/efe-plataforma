import { ActualizarMeSchema, MeSchema } from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class ActualizarMeDto extends createZodDto(ActualizarMeSchema) {}
export class MeDto extends createZodDto(MeSchema) {}
