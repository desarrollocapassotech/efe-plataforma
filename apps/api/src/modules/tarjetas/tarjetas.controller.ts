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
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  Compra,
  Compromisos,
  Pagina,
  PagoResumen,
  ResumenFechas,
  ResumenTarjeta,
  Tarjeta,
} from '@efe/shared/schemas';
import { PeriodoSchema } from '@efe/shared/schemas';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { AppException } from '../../common/errors/app.exception';
import { ComprasService } from './compras.service';
import {
  ActualizarCompraDto,
  ActualizarTarjetaDto,
  CierreTarjetaDto,
  CompraDto,
  CompromisosDto,
  CompromisosQueryDto,
  CrearCompraDto,
  CrearPagoResumenDto,
  CrearTarjetaDto,
  ListarComprasQueryDto,
  ListarPagosQueryDto,
  ListarTarjetasQueryDto,
  PagoResumenDto,
  PaginaComprasDto,
  ResumenFechasDto,
  ResumenTarjetaDto,
  ResumenTarjetaQueryDto,
  TarjetaDto,
} from './dto/tarjetas.dto';
import { PagosService } from './pagos.service';
import { TarjetasService } from './tarjetas.service';

function periodoValido(periodo: string): string {
  if (!PeriodoSchema.safeParse(periodo).success) {
    throw new AppException(
      'VALIDACION',
      'Período inválido (se espera YYYY-MM)',
      HttpStatus.BAD_REQUEST,
    );
  }
  return periodo;
}

@ApiTags('tarjetas')
@ApiBearerAuth()
@RequiresFeature('tarjetas')
@Controller('tarjetas')
export class TarjetasController {
  constructor(private readonly tarjetas: TarjetasService) {}

  @Get()
  @ApiOkResponse({ type: [TarjetaDto] })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarTarjetasQueryDto,
  ): Promise<Tarjeta[]> {
    return this.tarjetas.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: TarjetaDto })
  crear(@CurrentUser() usuario: UsuarioActual, @Body() datos: CrearTarjetaDto): Promise<Tarjeta> {
    return this.tarjetas.crear(usuario.id, datos);
  }

  /** Detalle de resúmenes: cuotas, totales por moneda, pagos y lo que falta pagar. */
  @Get('resumen')
  @ApiOkResponse({ type: [ResumenTarjetaDto] })
  resumen(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ResumenTarjetaQueryDto,
  ): Promise<ResumenTarjeta[]> {
    return this.tarjetas.resumen(usuario.id, query);
  }

  /** "Cuánto tengo comprometido": cuotas de los próximos meses por período y tarjeta. */
  @Get('compromisos')
  @ApiOkResponse({ type: CompromisosDto })
  compromisos(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: CompromisosQueryDto,
  ): Promise<Compromisos> {
    return this.tarjetas.compromisos(usuario.id, query);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TarjetaDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarTarjetaDto,
  ): Promise<Tarjeta> {
    return this.tarjetas.actualizar(usuario.id, id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.tarjetas.borrar(usuario.id, id);
  }

  /** Fechas reales de un resumen (override). Recalcula las cuotas desde ese período. */
  @Put(':id/cierres/:periodo')
  @ApiOkResponse({ type: ResumenFechasDto })
  guardarCierre(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Param('periodo') periodo: string,
    @Body() datos: CierreTarjetaDto,
  ): Promise<ResumenFechas> {
    return this.tarjetas.guardarCierre(usuario.id, id, periodoValido(periodo), datos);
  }

  /** Vuelve a las fechas calculadas de ese período. */
  @Delete(':id/cierres/:periodo')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrarCierre(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Param('periodo') periodo: string,
  ): Promise<void> {
    return this.tarjetas.borrarCierre(usuario.id, id, periodoValido(periodo));
  }
}

@ApiTags('tarjetas')
@ApiBearerAuth()
@RequiresFeature('tarjetas')
@Controller('tarjetas/compras')
export class ComprasController {
  constructor(private readonly compras: ComprasService) {}

  @Get()
  @ApiOkResponse({ type: PaginaComprasDto })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarComprasQueryDto,
  ): Promise<Pagina<Compra>> {
    return this.compras.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: CompraDto })
  crear(@CurrentUser() usuario: UsuarioActual, @Body() datos: CrearCompraDto): Promise<Compra> {
    return this.compras.crear(usuario.id, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CompraDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarCompraDto,
  ): Promise<Compra> {
    return this.compras.actualizar(usuario.id, id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.compras.borrar(usuario.id, id);
  }
}

@ApiTags('tarjetas')
@ApiBearerAuth()
@RequiresFeature('tarjetas')
@Controller('tarjetas/pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Get()
  @ApiOkResponse({ type: [PagoResumenDto] })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarPagosQueryDto,
  ): Promise<PagoResumen[]> {
    return this.pagos.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: PagoResumenDto })
  crear(
    @CurrentUser() usuario: UsuarioActual,
    @Body() datos: CrearPagoResumenDto,
  ): Promise<PagoResumen> {
    return this.pagos.crear(usuario.id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.pagos.borrar(usuario.id, id);
  }
}
