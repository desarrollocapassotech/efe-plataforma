// Categorías default que se siembran a cada usuario nuevo (ARCHITECTURE §5.1 "Categorías").
// La usan la API (guard de auth) y prisma/seed.ts, que corre con Node directo (type
// stripping) fuera del build de Nest: por eso solo importa de @efe/shared (ya compilado).
import { PALETA_CATEGORIAS } from '@efe/shared/categorias';

export { PALETA_CATEGORIAS };

type TipoCategoria = 'GASTO' | 'INGRESO';

export interface CategoriaPlantilla {
  tipo: TipoCategoria;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
}

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
