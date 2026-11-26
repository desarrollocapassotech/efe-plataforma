import type { TipoCuenta } from '@efe/shared/schemas';

/** Cómo se muestra cada tipo de cuenta: lenguaje cotidiano + un ícono reconocible. */
export const TIPOS_DE_CUENTA: { tipo: TipoCuenta; nombre: string; icono: string }[] = [
  { tipo: 'EFECTIVO', nombre: 'Efectivo', icono: '💵' },
  { tipo: 'BANCO', nombre: 'Banco', icono: '🏦' },
  { tipo: 'BILLETERA', nombre: 'Billetera virtual', icono: '📱' },
  { tipo: 'INVERSION', nombre: 'Inversiones', icono: '📈' },
  { tipo: 'OTRA', nombre: 'Otra', icono: '👛' },
];

export const iconoDeCuenta = (tipo: TipoCuenta) =>
  TIPOS_DE_CUENTA.find((t) => t.tipo === tipo)?.icono ?? '👛';

export const nombreDeTipo = (tipo: TipoCuenta) =>
  TIPOS_DE_CUENTA.find((t) => t.tipo === tipo)?.nombre ?? 'Otra';

export const NOMBRE_MONEDA = { ARS: 'Pesos', USD: 'Dólares' } as const;
