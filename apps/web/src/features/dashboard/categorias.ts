import { aString2Decimales, porcentaje, sumar } from '@efe/shared/dinero';
import type { GastoPorCategoria } from '@efe/shared/schemas';

export interface FilaCategoria extends GastoPorCategoria {
  /** true en la fila "Otras" que junta las categorías chicas. */
  otras?: boolean;
}

/**
 * Las `max` categorías con más gasto y el resto sumado en "Otras" (una lista larga de
 * barras chiquitas no se lee). Si sobra una sola, se muestra tal cual.
 */
export function resumirCategorias(
  porCategoria: GastoPorCategoria[],
  totalGastos: string,
  max = 5,
): FilaCategoria[] {
  if (porCategoria.length <= max + 1) return porCategoria;
  const principales = porCategoria.slice(0, max);
  const resto = porCategoria.slice(max);
  const total = aString2Decimales(sumar(...resto.map((c) => c.total)));
  return [
    ...principales,
    {
      categoriaId: null,
      nombre: `Otras ${resto.length}`,
      color: null,
      icono: null,
      total,
      porcentaje: porcentaje(total, totalGastos),
      otras: true,
    },
  ];
}
