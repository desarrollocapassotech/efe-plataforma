import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Me } from '@efe/shared/schemas';
import { CurrentUser } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { ActualizarMeDto, MeDto } from './dto/actualizar-me.dto';
import { UsuariosService } from './usuarios.service';

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
}
