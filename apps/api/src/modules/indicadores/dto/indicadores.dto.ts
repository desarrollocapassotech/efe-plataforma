import {
  CorregirIndicadorSchema,
  HistoricoQuerySchema,
  HistoricoSchema,
  IndicadorAdminSchema,
  IndicadoresSchema,
  ListarIndicadoresAdminQuerySchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class IndicadoresDto extends createZodDto(IndicadoresSchema) {}
export class HistoricoQueryDto extends createZodDto(HistoricoQuerySchema) {}
export class HistoricoDto extends createZodDto(HistoricoSchema) {}
export class ListarIndicadoresAdminQueryDto extends createZodDto(
  ListarIndicadoresAdminQuerySchema,
) {}
export class CorregirIndicadorDto extends createZodDto(CorregirIndicadorSchema) {}
export class IndicadorAdminDto extends createZodDto(IndicadorAdminSchema) {}
