// Categorías default que se siembran a cada usuario nuevo (ARCHITECTURE §5.1 "Categorías").
// Sin imports a propósito: la usan la API (guard de auth, paso 1.5) y prisma/seed.ts,
// que corre con Node directo (type stripping) fuera del build de Nest.

type TipoCategoria = 'GASTO' | 'INGRESO';

export interface CategoriaPlantilla {
  tipo: TipoCategoria;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
}

/**
 * Paleta de categorías: el azul marino y el dorado de EFE (en tonos que se leen sobre
 * fondo claro y oscuro), más colores categóricos bien separados entre sí y neutros.
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

const C = PALETA_CATEGORIAS;

const GASTOS: Omit<CategoriaPlantilla, 'tipo' | 'orden'>[] = [
  { nombre: 'Vivienda', icono: '🏠', color: C.azulEfe },
  { nombre: 'Alimentación', icono: '🛒', color: C.verde },
  { nombre: 'Transporte', icono: '🚗', color: C.azul },
  { nombre: 'Servicios', icono: '💡', color: C.ambar },
  { nombre: 'Salud', icono: '🏥', color: C.rojo },
  { nombre: 'Entretenimiento', icono: '🎬', color: C.violeta },
  { nombre: 'Salidas', icono: '🍷', color: C.rosa },
  { nombre: 'Educación', icono: '📚', color: C.turquesa },
  { nombre: 'Ropa', icono: '👕', color: C.coral },
  { nombre: 'Regalos', icono: '🎁', color: C.doradoEfe },
  { nombre: 'Impuestos', icono: '🧾', color: C.pizarra },
  { nombre: 'Mascotas', icono: '🐾', color: C.marron },
  { nombre: 'Otros', icono: '📦', color: C.gris },
];

const INGRESOS: Omit<CategoriaPlantilla, 'tipo' | 'orden'>[] = [
  { nombre: 'Sueldo', icono: '💼', color: C.azulEfe },
  { nombre: 'Honorarios', icono: '🧑‍💻', color: C.turquesa },
  { nombre: 'Alquileres', icono: '🏘️', color: C.doradoEfe },
  { nombre: 'Ventas', icono: '🏷️', color: C.verde },
  { nombre: 'Otros ingresos', icono: '➕', color: C.gris },
];

export const PLANTILLA_CATEGORIAS: readonly CategoriaPlantilla[] = Object.freeze([
  ...GASTOS.map((c, i) => ({ ...c, tipo: 'GASTO' as const, orden: i })),
  ...INGRESOS.map((c, i) => ({ ...c, tipo: 'INGRESO' as const, orden: i })),
]);

/** Filas para `prisma.categoria.createMany` de un usuario nuevo. */
export function categoriasDefaultPara(usuarioId: string) {
  return PLANTILLA_CATEGORIAS.map((c) => ({ ...c, usuarioId, esDefault: true }));
}
