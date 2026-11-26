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
import type { Pagina, Transferencia } from '@efe/shared/schemas';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import {
  ActualizarTransferenciaDto,
  CrearTransferenciaDto,
  ListarTransferenciasQueryDto,
  PaginaTransferenciasDto,
  TransferenciaDto,
} from './dto/transferencias.dto';
import { TransferenciasService } from './transferencias.service';

@ApiTags('transferencias')
@ApiBearerAuth()
@RequiresFeature('finanzas')
@Controller('transferencias')
export class TransferenciasController {
  constructor(private readonly transferencias: TransferenciasService) {}

  @Get()
  @ApiOkResponse({ type: PaginaTransferenciasDto })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarTransferenciasQueryDto,
  ): Promise<Pagina<Transferencia>> {
    return this.transferencias.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: TransferenciaDto })
  crear(
    @CurrentUser() usuario: UsuarioActual,
    @Body() datos: CrearTransferenciaDto,
  ): Promise<Transferencia> {
    return this.transferencias.crear(usuario.id, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TransferenciaDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarTransferenciaDto,
  ): Promise<Transferencia> {
    return this.transferencias.actualizar(usuario.id, id, datos);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.transferencias.borrar(usuario.id, id);
  }
}
