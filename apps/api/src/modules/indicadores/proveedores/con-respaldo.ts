import type { ProveedorIndicadores, ValorExterno } from './tipos';

/**
 * Usa la fuente principal y, si falla, la de respaldo (para el mismo indicador: así no
 * se mezclan dos fuentes en la misma corrida). Si fallan las dos, falla con ambos motivos.
 */
export class ProveedorConRespaldo implements ProveedorIndicadores {
  readonly nombre: string;

  constructor(
    private readonly principal: ProveedorIndicadores,
    private readonly respaldo: ProveedorIndicadores,
    private readonly alFallar: (error: unknown) => void = () => undefined,
  ) {
    this.nombre = `${principal.nombre} (respaldo: ${respaldo.nombre})`;
  }

  async obtener(): Promise<ValorExterno[]> {
    try {
      return await this.principal.obtener();
    } catch (error) {
      this.alFallar(error);
      try {
        return await this.respaldo.obtener();
      } catch (errorRespaldo) {
        const motivo = (e: unknown) => (e instanceof Error ? e.message : String(e));
        throw new Error(`${motivo(error)} | ${motivo(errorRespaldo)}`, {
          cause: errorRespaldo,
        });
      }
    }
  }
}
