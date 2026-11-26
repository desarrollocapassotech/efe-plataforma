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
import type { Cuenta } from '@efe/shared/schemas';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { CuentasService } from './cuentas.service';
import {
  ActualizarCuentaDto,
  CrearCuentaDto,
  CuentaDto,
  ListarCuentasQueryDto,
} from './dto/cuentas.dto';

@ApiTags('cuentas')
@ApiBearerAuth()
@RequiresFeature('finanzas')
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly cuentas: CuentasService) {}

  @Get()
  @ApiOkResponse({ type: [CuentaDto] })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarCuentasQueryDto,
  ): Promise<Cuenta[]> {
    return this.cuentas.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: CuentaDto })
  crear(@CurrentUser() usuario: UsuarioActual, @Body() datos: CrearCuentaDto): Promise<Cuenta> {
    return this.cuentas.crear(usuario.id, datos);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CuentaDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarCuentaDto,
  ): Promise<Cuenta> {
    return this.cuentas.actualizar(usuario.id, id, datos);
  }

  /** 409 CUENTA_CON_MOVIMIENTOS si tiene operaciones: el front ofrece archivar. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.cuentas.borrar(usuario.id, id);
  }
}
