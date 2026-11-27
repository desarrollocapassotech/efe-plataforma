import type { CodigoIndicador } from '@efe/shared/indicadores';

/** Un dato tal como lo entrega una fuente, ya mapeado a nuestros códigos. */
export interface ValorExterno {
  codigo: CodigoIndicador;
  /** YYYY-MM-DD: día del dato (IPC: primer día del mes). */
  fecha: string;
  /** String decimal con hasta 6 decimales. */
  valor: string;
  fuente: string;
  urlFuente: string | null;
}

/** Un adaptador por fuente (ARCHITECTURE §7). */
export interface ProveedorIndicadores {
  readonly nombre: string;
  obtener(): Promise<ValorExterno[]>;
}

/** La fuente no respondió, respondió con error o cambió el formato. */
export class ErrorFuente extends Error {
  constructor(
    readonly fuente: string,
    mensaje: string,
  ) {
    super(`${fuente}: ${mensaje}`);
    this.name = 'ErrorFuente';
  }
}
