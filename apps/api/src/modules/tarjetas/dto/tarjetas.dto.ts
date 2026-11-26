import {
  ActualizarCompraSchema,
  ActualizarTarjetaSchema,
  CierreTarjetaSchema,
  CompraSchema,
  CompromisosQuerySchema,
  CompromisosSchema,
  CrearCompraSchema,
  CrearPagoResumenSchema,
  CrearTarjetaSchema,
  ListarComprasQuerySchema,
  ListarPagosQuerySchema,
  ListarTarjetasQuerySchema,
  PagoResumenSchema,
  PaginaComprasSchema,
  ResumenFechasSchema,
  ResumenTarjetaQuerySchema,
  ResumenTarjetaSchema,
  TarjetaSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearTarjetaDto extends createZodDto(CrearTarjetaSchema) {}
export class ActualizarTarjetaDto extends createZodDto(ActualizarTarjetaSchema) {}
export class ListarTarjetasQueryDto extends createZodDto(ListarTarjetasQuerySchema) {}
export class TarjetaDto extends createZodDto(TarjetaSchema) {}
export class CierreTarjetaDto extends createZodDto(CierreTarjetaSchema) {}
export class ResumenFechasDto extends createZodDto(ResumenFechasSchema) {}
export class ResumenTarjetaQueryDto extends createZodDto(ResumenTarjetaQuerySchema) {}
export class ResumenTarjetaDto extends createZodDto(ResumenTarjetaSchema) {}
export class CompromisosQueryDto extends createZodDto(CompromisosQuerySchema) {}
export class CompromisosDto extends createZodDto(CompromisosSchema) {}

export class CrearCompraDto extends createZodDto(CrearCompraSchema) {}
export class ActualizarCompraDto extends createZodDto(ActualizarCompraSchema) {}
export class ListarComprasQueryDto extends createZodDto(ListarComprasQuerySchema) {}
export class CompraDto extends createZodDto(CompraSchema) {}
export class PaginaComprasDto extends createZodDto(PaginaComprasSchema) {}

export class CrearPagoResumenDto extends createZodDto(CrearPagoResumenSchema) {}
export class ListarPagosQueryDto extends createZodDto(ListarPagosQuerySchema) {}
export class PagoResumenDto extends createZodDto(PagoResumenSchema) {}
