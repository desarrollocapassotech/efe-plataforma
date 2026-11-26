import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  EvolucionQuerySchema,
  EvolucionSchema,
  ResumenMensualQuerySchema,
  ResumenMensualSchema,
  type Evolucion,
  type ResumenMensual,
} from '@efe/shared/schemas';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { ResumenService } from './resumen.service';

class ResumenMensualQueryDto extends createZodDto(ResumenMensualQuerySchema) {}
class ResumenMensualDto extends createZodDto(ResumenMensualSchema) {}
class EvolucionQueryDto extends createZodDto(EvolucionQuerySchema) {}
class EvolucionDto extends createZodDto(EvolucionSchema) {}

@ApiTags('resumen')
@ApiBearerAuth()
@RequiresFeature('finanzas')
@Controller('resumen')
export class ResumenController {
  constructor(private readonly resumen: ResumenService) {}

  /** Totales del mes por moneda, gastos por categoría y comparación con el mes anterior. */
  @Get('mensual')
  @ApiOkResponse({ type: ResumenMensualDto })
  mensual(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ResumenMensualQueryDto,
  ): Promise<ResumenMensual> {
    return this.resumen.mensual(usuario.id, query.periodo);
  }

  /** Serie mensual de ingresos, gastos (movimientos + cuotas) y saldo por moneda. */
  @Get('evolucion')
  @ApiOkResponse({ type: EvolucionDto })
  evolucion(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: EvolucionQueryDto,
  ): Promise<Evolucion> {
    return this.resumen.evolucion(usuario.id, query.meses, query.hasta);
  }
}
