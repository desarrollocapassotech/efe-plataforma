import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { hoy } from '@efe/shared/fechas';
import type { Me } from '@efe/shared/schemas';
import type { Request, Response } from 'express';
import { CurrentUser, PermitirCuentaEliminada } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import {
  AceptarTerminosDto,
  ActualizarMeDto,
  EliminarCuentaDto,
  MeDto,
} from './dto/actualizar-me.dto';
import { UsuariosService } from './usuarios.service';

/** 3 por hora: exportar y dar de baja son acciones pesadas y sensibles (ARCHITECTURE §9). */
const TRES_POR_HORA = { default: { limit: 3, ttl: 60 * 60_000 } };

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('me')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** Usuario actual con su plan y features. La primera vez crea el usuario (lo hace el guard). */
  @Get()
  @ApiOkResponse({ type: MeDto })
  obtener(@CurrentUser() usuario: UsuarioActual): Promise<Me> {
    return this.usuarios.obtenerMe(usuario.id);
  }

  @Patch()
  @ApiOkResponse({ type: MeDto })
  actualizar(@CurrentUser() usuario: UsuarioActual, @Body() datos: ActualizarMeDto): Promise<Me> {
    return this.usuarios.actualizarMe(usuario.id, datos);
  }

  /** Acepta la versión vigente de términos y privacidad (queda la fecha y la versión). */
  @Post('terminos')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MeDto })
  aceptarTerminos(
    @CurrentUser() usuario: UsuarioActual,
    // El body se valida (versión vigente) aunque solo se use la constante.
    @Body() _datos: AceptarTerminosDto,
    @Req() req: Request,
  ): Promise<Me> {
    return this.usuarios.aceptarTerminos(usuario.id, req.ip);
  }

  /** Descarga de todos los datos del usuario en JSON (Ley 25.326). */
  @Get('exportar')
  @Throttle(TRES_POR_HORA)
  async exportar(
    @CurrentUser() usuario: UsuarioActual,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Content-Disposition', `attachment; filename="efe-mis-datos-${hoy()}.json"`);
    return this.usuarios.exportar(usuario.id, req.ip);
  }

  /** Baja de cuenta: se puede recuperar durante 30 días; después se borra todo. */
  @Delete()
  @Throttle(TRES_POR_HORA)
  @HttpCode(HttpStatus.OK)
  eliminar(
    @CurrentUser() usuario: UsuarioActual,
    @Body() _confirmacion: EliminarCuentaDto,
    @Req() req: Request,
  ): Promise<{ purgaEn: string }> {
    return this.usuarios.eliminar(usuario.id, req.ip);
  }

  /** Recupera la cuenta dentro de los 30 días (acepta usuarios dados de baja). */
  @Post('restaurar')
  @PermitirCuentaEliminada()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MeDto })
  restaurar(@CurrentUser() usuario: UsuarioActual, @Req() req: Request): Promise<Me> {
    return this.usuarios.restaurar(usuario.id, req.ip);
  }
}
