/**
 * Paleta de colores de categorías: el azul marino y el dorado de EFE (en tonos que se leen
 * sobre fondo claro y oscuro), más colores categóricos bien separados entre sí y neutros.
 * La usan la plantilla de categorías default (API) y el selector de color (web).
 */
export const PALETA_CATEGORIAS = {
  azulEfe: '#2E4A8B',
  doradoEfe: '#B08900',
  verde: '#2F9E62',
  azul: '#3B7DD8',
  ambar: '#E39B1B',
  rojo: '#C9404E',
  violeta: '#7B5CB8',
  rosa: '#C2569A',
  turquesa: '#0F8B8D',
  coral: '#E0673C',
  marron: '#8D6E4F',
  pizarra: '#64748B',
  gris: '#9CA3AF',
} as const;

export type ColorCategoria = (typeof PALETA_CATEGORIAS)[keyof typeof PALETA_CATEGORIAS];

/** Los colores en el orden en que se ofrecen en el selector. */
export const COLORES_CATEGORIA: readonly ColorCategoria[] = Object.values(PALETA_CATEGORIAS);
