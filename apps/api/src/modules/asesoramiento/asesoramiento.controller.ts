import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type {
  BrokerAsesoramiento,
  ClienteAsesoramiento,
  PlanAsesoramiento,
  ResultadoLote,
  ServicioAsesoramiento,
} from '@efe/shared/schemas';
import type { Request } from 'express';
import { CurrentUser, Roles } from '../../common/auth/decoradores';
import { LIMITE_ADMIN } from '../../common/auth/limites';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { CatalogoService } from './catalogo.service';
import { ClientesService } from './clientes.service';
import {
  ActualizarBrokerDto,
  ActualizarClienteDto,
  ActualizarItemPrecioDto,
  ActualizarPrecioPlanDto,
  AsignarPlanDto,
  BrokerAsesoramientoDto,
  ClienteAsesoramientoDto,
  CrearBrokerDto,
  CrearClienteDto,
  CrearItemPrecioDto,
  DeshabilitarClienteDto,
  ListarClientesQueryDto,
  PlanAsesoramientoDto,
  ResultadoLoteDto,
  ServicioAsesoramientoDto,
  SuscripcionClienteDto,
  VincularUsuarioDto,
} from './dto/asesoramiento.dto';

@ApiTags('asesoramiento')
@ApiBearerAuth()
@Roles('ADMIN')
@Throttle(LIMITE_ADMIN)
@Controller('admin/asesoramiento/clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  @ApiOkResponse({ type: [ClienteAsesoramientoDto] })
  listar(@Query() q: ListarClientesQueryDto): Promise<ClienteAsesoramiento[]> {
    return this.clientes.listar(q);
  }

  @Get(':id')
  @ApiOkResponse({ type: ClienteAsesoramientoDto })
  obtener(@Param('id') id: string): Promise<ClienteAsesoramiento> {
    return this.clientes.obtener(id);
  }

  @Post()
  @ApiOkResponse({ type: ClienteAsesoramientoDto })
  crear(@Body() d: CrearClienteDto): Promise<ClienteAsesoramiento> {
    return this.clientes.crear(d);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ClienteAsesoramientoDto })
  actualizar(
    @Param('id') id: string,
    @Body() d: ActualizarClienteDto,
  ): Promise<ClienteAsesoramiento> {
    return this.clientes.actualizar(id, d);
  }

  /** Baja lógica (los clientes nunca se borran). */
  @Post(':id/deshabilitar')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ClienteAsesoramientoDto })
  deshabilitar(
    @Param('id') id: string,
    @Body() d: DeshabilitarClienteDto,
  ): Promise<ClienteAsesoramiento> {
    return this.clientes.deshabilitar(id, d);
  }

  @Post(':id/habilitar')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ClienteAsesoramientoDto })
  habilitar(@Param('id') id: string): Promise<ClienteAsesoramiento> {
    return this.clientes.habilitar(id);
  }

  @Put(':id/suscripcion')
  @ApiOkResponse({ type: ClienteAsesoramientoDto })
  guardarSuscripcion(
    @Param('id') id: string,
    @Body() d: SuscripcionClienteDto,
  ): Promise<ClienteAsesoramiento> {
    return this.clientes.guardarSuscripcion(id, d);
  }

  /** Vincula con un usuario de la plataforma (le pone plan ASESORAMIENTO). Auditado. */
  @Put(':id/usuario')
  @ApiOkResponse({ type: ClienteAsesoramientoDto })
  vincularUsuario(
    @CurrentUser() actor: UsuarioActual,
    @Param('id') id: string,
    @Body() d: VincularUsuarioDto,
    @Req() req: Request,
  ): Promise<ClienteAsesoramiento> {
    return this.clientes.vincularUsuario(actor.id, id, d.usuarioId, req.ip);
  }
}

@ApiTags('asesoramiento')
@ApiBearerAuth()
@Roles('ADMIN')
@Throttle(LIMITE_ADMIN)
@Controller('admin/asesoramiento')
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get('brokers')
  @ApiOkResponse({ type: [BrokerAsesoramientoDto] })
  listarBrokers(): Promise<BrokerAsesoramiento[]> {
    return this.catalogo.listarBrokers();
  }

  @Post('brokers')
  @ApiOkResponse({ type: BrokerAsesoramientoDto })
  crearBroker(@Body() d: CrearBrokerDto): Promise<BrokerAsesoramiento> {
    return this.catalogo.crearBroker(d);
  }

  @Patch('brokers/:id')
  @ApiOkResponse({ type: BrokerAsesoramientoDto })
  actualizarBroker(
    @Param('id') id: string,
    @Body() d: ActualizarBrokerDto,
  ): Promise<BrokerAsesoramiento> {
    return this.catalogo.actualizarBroker(id, d);
  }

  @Delete('brokers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrarBroker(@Param('id') id: string): Promise<void> {
    return this.catalogo.borrarBroker(id);
  }

  @Get('planes')
  @ApiOkResponse({ type: [PlanAsesoramientoDto] })
  listarPlanes(): Promise<PlanAsesoramiento[]> {
    return this.catalogo.listarPlanes();
  }

  @Post('planes')
  @ApiOkResponse({ type: PlanAsesoramientoDto })
  crearPlan(@Body() d: CrearItemPrecioDto): Promise<PlanAsesoramiento> {
    return this.catalogo.crearPlan(d);
  }

  @Patch('planes/:id')
  @ApiOkResponse({ type: PlanAsesoramientoDto })
  actualizarPlan(
    @Param('id') id: string,
    @Body() d: ActualizarItemPrecioDto,
  ): Promise<PlanAsesoramiento> {
    return this.catalogo.actualizarPlan(id, d);
  }

  @Delete('planes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrarPlan(@Param('id') id: string): Promise<void> {
    return this.catalogo.borrarPlan(id);
  }

  @Post('planes/:id/asignar')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResultadoLoteDto })
  asignarPlan(@Param('id') id: string, @Body() d: AsignarPlanDto): Promise<ResultadoLote> {
    return this.catalogo.asignarPlan(id, d);
  }

  @Post('planes/:id/precio')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResultadoLoteDto })
  actualizarPrecio(
    @Param('id') id: string,
    @Body() d: ActualizarPrecioPlanDto,
  ): Promise<ResultadoLote> {
    return this.catalogo.actualizarPrecio(id, d);
  }

  @Get('servicios')
  @ApiOkResponse({ type: [ServicioAsesoramientoDto] })
  listarServicios(): Promise<ServicioAsesoramiento[]> {
    return this.catalogo.listarServicios();
  }

  @Post('servicios')
  @ApiOkResponse({ type: ServicioAsesoramientoDto })
  crearServicio(@Body() d: CrearItemPrecioDto): Promise<ServicioAsesoramiento> {
    return this.catalogo.crearServicio(d);
  }

  @Patch('servicios/:id')
  @ApiOkResponse({ type: ServicioAsesoramientoDto })
  actualizarServicio(
    @Param('id') id: string,
    @Body() d: ActualizarItemPrecioDto,
  ): Promise<ServicioAsesoramiento> {
    return this.catalogo.actualizarServicio(id, d);
  }

  @Delete('servicios/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrarServicio(@Param('id') id: string): Promise<void> {
    return this.catalogo.borrarServicio(id);
  }
}
