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
import type { Recurrencia } from '@efe/shared/schemas';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import {
  ActualizarRecurrenciaDto,
  CrearRecurrenciaDto,
  ListarRecurrenciasQueryDto,
  RecurrenciaDto,
} from './dto/recurrencias.dto';
import { RecurrenciasService } from './recurrencias.service';

@ApiTags('recurrencias')
@ApiBearerAuth()
@RequiresFeature('finanzas')
@Controller('recurrencias')
export class RecurrenciasController {
  constructor(private readonly recurrencias: RecurrenciasService) {}

  @Get()
  @ApiOkResponse({ type: [RecurrenciaDto] })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarRecurrenciasQueryDto,
  ): Promise<Recurrencia[]> {
    return this.recurrencias.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: RecurrenciaDto })
  crear(
    @CurrentUser() usuario: UsuarioActual,
    @Body() datos: CrearRecurrenciaDto,
  ): Promise<Recurrencia> {
    return this.recurrencias.crear(usuario.id, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: RecurrenciaDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarRecurrenciaDto,
  ): Promise<Recurrencia> {
    return this.recurrencias.actualizar(usuario.id, id, datos);
  }

  /** Los movimientos ya generados no se borran. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.recurrencias.borrar(usuario.id, id);
  }
}
