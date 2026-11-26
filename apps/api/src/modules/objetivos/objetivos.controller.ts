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
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Aporte, Objetivo, ObjetivoDetalle } from '@efe/shared/schemas';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import {
  ActualizarObjetivoDto,
  AporteDto,
  CrearAporteDto,
  CrearObjetivoDto,
  ObjetivoDetalleDto,
  ObjetivoDto,
} from './dto/objetivos.dto';
import { ObjetivosService } from './objetivos.service';

@ApiTags('objetivos')
@ApiBearerAuth()
@RequiresFeature('objetivos')
@Controller('objetivos')
export class ObjetivosController {
  constructor(private readonly objetivos: ObjetivosService) {}

  /** Cada objetivo con su avance (acumulado, %, aporte sugerido, fecha estimada). */
  @Get()
  @ApiOkResponse({ type: [ObjetivoDto] })
  listar(@CurrentUser() usuario: UsuarioActual): Promise<Objetivo[]> {
    return this.objetivos.listar(usuario.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: ObjetivoDetalleDto })
  obtener(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
  ): Promise<ObjetivoDetalle> {
    return this.objetivos.obtener(usuario.id, id);
  }

  @Post()
  @ApiOkResponse({ type: ObjetivoDto })
  crear(@CurrentUser() usuario: UsuarioActual, @Body() datos: CrearObjetivoDto): Promise<Objetivo> {
    return this.objetivos.crear(usuario.id, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ObjetivoDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarObjetivoDto,
  ): Promise<Objetivo> {
    return this.objetivos.actualizar(usuario.id, id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.objetivos.borrar(usuario.id, id);
  }

  @Post(':id/aportes')
  @ApiOkResponse({ type: AporteDto })
  aportar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: CrearAporteDto,
  ): Promise<Aporte> {
    return this.objetivos.aportar(usuario.id, id, datos);
  }

  @Delete(':id/aportes/:aporteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrarAporte(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Param('aporteId') aporteId: string,
  ): Promise<void> {
    return this.objetivos.borrarAporte(usuario.id, id, aporteId);
  }
}
