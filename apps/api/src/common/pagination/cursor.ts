import { HttpStatus } from '@nestjs/common';
import { AppException } from '../errors/app.exception';

/**
 * Paginación por cursor (keyset) para listados ordenados por
 * fecha desc, creadoEn desc, id desc. El cursor guarda los valores del último item, así
 * sigue funcionando aunque ese item se borre (a diferencia de un cursor por id) y no se
 * saltean ni repiten filas como con OFFSET cuando se cargan datos nuevos.
 */
export interface PosicionCursor {
  fecha: Date;
  creadoEn: Date;
  id: string;
}

export function codificarCursor({ fecha, creadoEn, id }: PosicionCursor): string {
  const json = JSON.stringify([fecha.toISOString(), creadoEn.toISOString(), id]);
  return Buffer.from(json).toString('base64url');
}

export function decodificarCursor(cursor: string): PosicionCursor {
  try {
    const [fecha, creadoEn, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as [
      string,
      string,
      string,
    ];
    const posicion = { fecha: new Date(fecha), creadoEn: new Date(creadoEn), id };
    if (
      Number.isNaN(posicion.fecha.getTime()) ||
      Number.isNaN(posicion.creadoEn.getTime()) ||
      typeof id !== 'string' ||
      !id
    ) {
      throw new Error('cursor inválido');
    }
    return posicion;
  } catch {
    throw new AppException(
      'CURSOR_INVALIDO',
      'El cursor de paginación no es válido',
      HttpStatus.BAD_REQUEST,
    );
  }
}

/** Condición "viene después de esta posición" en orden fecha desc, creadoEn desc, id desc. */
export function despuesDe({ fecha, creadoEn, id }: PosicionCursor) {
  return {
    OR: [
      { fecha: { lt: fecha } },
      { fecha, creadoEn: { lt: creadoEn } },
      { fecha, creadoEn, id: { lt: id } },
    ],
  };
}

export const ORDEN_CRONOLOGICO_DESC = [
  { fecha: 'desc' as const },
  { creadoEn: 'desc' as const },
  { id: 'desc' as const },
];

/** Pide limit + 1 filas: si vino una de más, hay otra página. */
export function armarPagina<T extends PosicionCursor, R>(
  filas: T[],
  limit: number,
  mapear: (fila: T) => R,
): { items: R[]; nextCursor: string | null } {
  const hayMas = filas.length > limit;
  const pagina = hayMas ? filas.slice(0, limit) : filas;
  const ultima = pagina.at(-1);
  return {
    items: pagina.map(mapear),
    nextCursor: hayMas && ultima ? codificarCursor(ultima) : null,
  };
}
