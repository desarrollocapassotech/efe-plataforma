import type { Fecha, Periodo } from '../fechas';

// Esqueleto: los casos están en tarjetas.test.ts; la implementación viene en el commit siguiente.

export interface ConfigTarjeta {
  diaCierre: number;
  diaVencimiento: number;
}

export interface Resumen {
  periodo: Periodo;
  fechaCierre: Fecha;
  fechaVencimiento: Fecha;
}

export type CierreOverride = Resumen;

export interface CuotaCalculada {
  numero: number;
  monto: string;
  periodoResumen: Periodo;
}

const pendiente = (): never => {
  throw new Error('No implementado');
};

export function calcularResumen(
  _fechaCompra: Fecha,
  _tarjeta: ConfigTarjeta,
  _overrides: CierreOverride[] = [],
): Resumen {
  return pendiente();
}

export function resumenDelPeriodo(
  _periodo: Periodo,
  _tarjeta: ConfigTarjeta,
  _overrides: CierreOverride[] = [],
): Resumen {
  return pendiente();
}

export function proximoResumen(
  _hoy: Fecha,
  _tarjeta: ConfigTarjeta,
  _overrides: CierreOverride[] = [],
): Resumen {
  return pendiente();
}

export function generarCuotas(
  _compra: { fecha: Fecha; montoTotal: string; cantidadCuotas: number },
  _tarjeta: ConfigTarjeta,
  _overrides: CierreOverride[] = [],
): CuotaCalculada[] {
  return pendiente();
}
