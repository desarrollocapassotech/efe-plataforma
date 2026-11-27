import { Body, Controller, Get, Param, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { esCodigoIndicador } from '@efe/shared/indicadores';
import type { Historico, IndicadorAdmin, Indicadores } from '@efe/shared/schemas';
import type { Request } from 'express';
import { CurrentUser, Public, Roles } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { noEncontrado } from '../../common/errors/errores';
import {
  CorregirIndicadorDto,
  HistoricoDto,
  HistoricoQueryDto,
  IndicadorAdminDto,
  IndicadoresDto,
  ListarIndicadoresAdminQueryDto,
} from './dto/indicadores.dto';
import { IndicadoresService } from './indicadores.service';

/** Públicos (sin login): la web los muestra también en /indicadores sin sesión (5.2). */
@ApiTags('indicadores')
@Public()
@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly indicadores: IndicadoresService) {}

  @Get()
  @ApiOkResponse({ type: IndicadoresDto })
  resumen(): Promise<Indicadores> {
    return this.indicadores.resumen();
  }

  @Get(':codigo/historico')
  @ApiOkResponse({ type: HistoricoDto })
  historico(
    @Param('codigo') codigo: string,
    @Query() query: HistoricoQueryDto,
  ): Promise<Historico> {
    if (!esCodigoIndicador(codigo)) throw noEncontrado(`No existe el indicador "${codigo}"`);
    return this.indicadores.historico(codigo, query);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/indicadores')
export class AdminIndicadoresController {
  constructor(private readonly indicadores: IndicadoresService) {}

  @Get()
  @ApiOkResponse({ type: [IndicadorAdminDto] })
  listar(@Query() query: ListarIndicadoresAdminQueryDto): Promise<IndicadorAdmin[]> {
    return this.indicadores.listarAdmin(query);
  }

  /** Corrige a mano el valor de un día (auditado; la ingesta no lo pisa). */
  @Put()
  @ApiOkResponse({ type: IndicadorAdminDto })
  corregir(
    @CurrentUser() usuario: UsuarioActual,
    @Body() datos: CorregirIndicadorDto,
    @Req() req: Request,
  ): Promise<IndicadorAdmin> {
    return this.indicadores.corregir(usuario.id, datos, req.ip);
  }
}
