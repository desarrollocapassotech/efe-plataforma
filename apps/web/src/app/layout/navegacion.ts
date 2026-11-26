import { ArrowLeftRight, CreditCard, House, Menu, Target, type LucideIcon } from 'lucide-react';

export interface ItemNavegacion {
  ruta: string;
  etiqueta: string;
  icono: LucideIcon;
}

/** Secciones principales: barra inferior en móvil, sidebar en desktop (ARCHITECTURE §3.2). */
export const NAVEGACION: ItemNavegacion[] = [
  { ruta: '/', etiqueta: 'Inicio', icono: House },
  { ruta: '/movimientos', etiqueta: 'Movimientos', icono: ArrowLeftRight },
  { ruta: '/tarjetas', etiqueta: 'Tarjetas', icono: CreditCard },
  { ruta: '/objetivos', etiqueta: 'Objetivos', icono: Target },
  { ruta: '/mas', etiqueta: 'Más', icono: Menu },
];
