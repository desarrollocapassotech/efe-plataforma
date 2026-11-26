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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Categoria, OrdenCategorias } from '@efe/shared/schemas';
import { CurrentUser, RequiresFeature } from '../../common/auth/decoradores';
import type { UsuarioActual } from '../../common/auth/usuario-actual';
import { CategoriasService } from './categorias.service';
import {
  ActualizarCategoriaDto,
  CategoriaDto,
  CrearCategoriaDto,
  ListarCategoriasQueryDto,
  OrdenCategoriasDto,
} from './dto/categorias.dto';

@ApiTags('categorias')
@ApiBearerAuth()
@RequiresFeature('finanzas')
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categorias: CategoriasService) {}

  @Get()
  @ApiOkResponse({ type: [CategoriaDto] })
  listar(
    @CurrentUser() usuario: UsuarioActual,
    @Query() query: ListarCategoriasQueryDto,
  ): Promise<Categoria[]> {
    return this.categorias.listar(usuario.id, query);
  }

  @Post()
  @ApiOkResponse({ type: CategoriaDto })
  crear(
    @CurrentUser() usuario: UsuarioActual,
    @Body() datos: CrearCategoriaDto,
  ): Promise<Categoria> {
    return this.categorias.crear(usuario.id, datos);
  }

  /** Va antes de las rutas con :id. */
  @Put('orden')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  ordenar(@CurrentUser() usuario: UsuarioActual, @Body() items: OrdenCategoriasDto): Promise<void> {
    // El DTO valida con OrdenCategoriasSchema (un array); el tipo útil es el del schema.
    return this.categorias.ordenar(usuario.id, items as unknown as OrdenCategorias);
  }

  @Patch(':id')
  @ApiOkResponse({ type: CategoriaDto })
  actualizar(
    @CurrentUser() usuario: UsuarioActual,
    @Param('id') id: string,
    @Body() datos: ActualizarCategoriaDto,
  ): Promise<Categoria> {
    return this.categorias.actualizar(usuario.id, id, datos);
  }

  /** 409 CATEGORIA_EN_USO si tiene movimientos, recurrencias o compras: se archiva. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  borrar(@CurrentUser() usuario: UsuarioActual, @Param('id') id: string): Promise<void> {
    return this.categorias.borrar(usuario.id, id);
  }
}
