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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Movimiento, Pagina } from '@efe/shared/schemas';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import {
  ActualizarMovimientoDto,
  CrearMovimientoDto,
  ListarMovimientosQueryDto,
  MovimientoDto,
  PaginaMovimientosDto,
} from './dto/movimientos.dto';
import { MovimientosService } from './movimientos.service';

@ApiTags('movimientos')
@ApiBearerAuth()
@RequiresFeature('finanzas')
@Controller('movimientos')
export class MovimientosController {
  constructor(private readonly movimientos: MovimientosService) {}

  @Get()
  @ApiOkResponse({ type: PaginaMovimientosDto })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarMovimientosQueryDto,
  ): Promise<Pagina<Movimiento>> {
    return this.movimientos.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: MovimientoDto })
  crear(
    @CurrentUser() usuario: UsuarioActual,
    @Body() datos: CrearMovimientoDto,
  ): Promise<Movimiento> {
    return this.movimientos.crear(usuario.id, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: MovimientoDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarMovimientoDto,
  ): Promise<Movimiento> {
    return this.movimientos.actualizar(usuario.id, id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.movimientos.borrar(usuario.id, id);
  }
}
