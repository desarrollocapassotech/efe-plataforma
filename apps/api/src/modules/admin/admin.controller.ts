import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LIMITE_ADMIN } from '../../common/auth/limites';
import type {
  AuditoriaItem,
  Metricas,
  PaginaAdmin,
  UsuarioAdmin,
  UsuarioAdminDetalle,
} from '@efe/shared/schemas';
import type { Request } from 'express';
import { CurrentUser, Roles } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { AdminService } from './admin.service';
import {
  CambiarPlanDto,
  ListarAuditoriaQueryDto,
  ListarUsuariosAdminQueryDto,
  MetricasDto,
  PaginaAuditoriaDto,
  PaginaUsuariosAdminDto,
  UsuarioAdminDetalleDto,
  UsuarioAdminDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Throttle(LIMITE_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('usuarios')
  @ApiOkResponse({ type: PaginaUsuariosAdminDto })
  listarUsuarios(@Query() query: ListarUsuariosAdminQueryDto): Promise<PaginaAdmin<UsuarioAdmin>> {
    return this.admin.listarUsuarios(query);
  }

  /** Solo contadores: el admin no ve montos ni movimientos de los usuarios. */
  @Get('usuarios/:id')
  @ApiOkResponse({ type: UsuarioAdminDetalleDto })
  obtenerUsuario(@Param('id') id: string): Promise<UsuarioAdminDetalle> {
    return this.admin.obtenerUsuario(id);
  }

  @Patch('usuarios/:id/plan')
  @ApiOkResponse({ type: UsuarioAdminDto })
  cambiarPlan(
    @CurrentUser() actor: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: CambiarPlanDto,
    @Req() req: Request,
  ): Promise<UsuarioAdmin> {
    return this.admin.cambiarPlan(actor.id, id, datos, req.ip);
  }

  @Get('metricas')
  @ApiOkResponse({ type: MetricasDto })
  metricas(): Promise<Metricas> {
    return this.admin.metricas();
  }

  @Get('auditoria')
  @ApiOkResponse({ type: PaginaAuditoriaDto })
  auditoria(@Query() query: ListarAuditoriaQueryDto): Promise<PaginaAdmin<AuditoriaItem>> {
    return this.admin.auditoria(query);
  }
}
