import {
  ActualizarBrokerSchema,
  ActualizarClienteSchema,
  ActualizarItemPrecioSchema,
  ActualizarPrecioPlanSchema,
  AsignarPlanSchema,
  BrokerAsesoramientoSchema,
  ClienteAsesoramientoSchema,
  CrearBrokerSchema,
  CrearClienteSchema,
  CrearItemPrecioSchema,
  DeshabilitarClienteSchema,
  ListarClientesQuerySchema,
  PlanAsesoramientoSchema,
  ResultadoLoteSchema,
  ServicioAsesoramientoSchema,
  SuscripcionClienteSchema,
  VincularUsuarioSchema,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';

export class CrearClienteDto extends createZodDto(CrearClienteSchema) {}
export class ActualizarClienteDto extends createZodDto(ActualizarClienteSchema) {}
export class ListarClientesQueryDto extends createZodDto(ListarClientesQuerySchema) {}
export class DeshabilitarClienteDto extends createZodDto(DeshabilitarClienteSchema) {}
export class SuscripcionClienteDto extends createZodDto(SuscripcionClienteSchema) {}
export class VincularUsuarioDto extends createZodDto(VincularUsuarioSchema) {}
export class ClienteAsesoramientoDto extends createZodDto(ClienteAsesoramientoSchema) {}
export class CrearBrokerDto extends createZodDto(CrearBrokerSchema) {}
export class ActualizarBrokerDto extends createZodDto(ActualizarBrokerSchema) {}
export class BrokerAsesoramientoDto extends createZodDto(BrokerAsesoramientoSchema) {}
export class CrearItemPrecioDto extends createZodDto(CrearItemPrecioSchema) {}
export class ActualizarItemPrecioDto extends createZodDto(ActualizarItemPrecioSchema) {}
export class AsignarPlanDto extends createZodDto(AsignarPlanSchema) {}
export class ActualizarPrecioPlanDto extends createZodDto(ActualizarPrecioPlanSchema) {}
export class PlanAsesoramientoDto extends createZodDto(PlanAsesoramientoSchema) {}
export class ServicioAsesoramientoDto extends createZodDto(ServicioAsesoramientoSchema) {}
export class ResultadoLoteDto extends createZodDto(ResultadoLoteSchema) {}
