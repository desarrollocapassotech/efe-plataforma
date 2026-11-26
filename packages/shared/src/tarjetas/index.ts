import { dividirEnCuotas } from '../dinero';
import {
  esFechaValida,
  fechaConDia,
  periodoDe,
  sumarPeriodos,
  type Fecha,
  type Periodo,
} from '../fechas';

// Cálculos de tarjeta de crédito (ARCHITECTURE §5.1: "Período de resumen", "Cálculo del
// período", "Montos de cuota"). El período de un resumen es el YYYY-MM de su vencimiento.

export interface ConfigTarjeta {
  /** 1..31; si el mes no tiene ese día, el último del mes. */
  diaCierre: number;
  /** 1..31; si el mes no tiene ese día, el último del mes. */
  diaVencimiento: number;
}

export interface Resumen {
  /** YYYY-MM del vencimiento (el mes en que se paga). */
  periodo: Periodo;
  fechaCierre: Fecha;
  fechaVencimiento: Fecha;
}

/** Fechas cargadas a mano para un período (`CierreTarjeta`): reemplazan las calculadas. */
export type CierreOverride = Resumen;

export interface CompraParaCuotas {
  fecha: Fecha;
  /** String decimal positivo con hasta 2 decimales. */
  montoTotal: string;
  cantidadCuotas: number;
}

export interface CuotaCalculada {
  numero: number;
  monto: string;
  periodoResumen: Periodo;
}

function validarDia(dia: number, nombre: string): void {
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new RangeError(`${nombre} inválido (1 a 31): ${dia}`);
  }
}

function validarTarjeta(t: ConfigTarjeta): void {
  validarDia(t.diaCierre, 'Día de cierre');
  validarDia(t.diaVencimiento, 'Día de vencimiento');
}

function validarFecha(fecha: Fecha): void {
  if (!esFechaValida(fecha)) throw new RangeError(`Fecha inválida: ${fecha}`);
}

/**
 * Resumen calculado (sin overrides) del cierre que cae en `mesCierre`: el vencimiento es
 * la primera fecha con `diaVencimiento` estrictamente posterior al cierre.
 */
function resumenPorDefecto(mesCierre: Periodo, t: ConfigTarjeta): Resumen {
  const fechaCierre = fechaConDia(mesCierre, t.diaCierre);
  let fechaVencimiento = fechaConDia(mesCierre, t.diaVencimiento);
  if (fechaVencimiento <= fechaCierre) {
    fechaVencimiento = fechaConDia(sumarPeriodos(mesCierre, 1), t.diaVencimiento);
  }
  return { periodo: periodoDe(fechaVencimiento), fechaCierre, fechaVencimiento };
}

/**
 * Resúmenes de los cierres de `cantidad` meses desde `desdeMes`, con los overrides
 * aplicados por período (un override reemplaza al resumen calculado de su mismo período),
 * ordenados por período.
 */
function resumenesDesde(
  desdeMes: Periodo,
  cantidad: number,
  t: ConfigTarjeta,
  overrides: CierreOverride[],
): Resumen[] {
  const porPeriodo = new Map<Periodo, Resumen>();
  for (let i = 0; i < cantidad; i++) {
    const r = resumenPorDefecto(sumarPeriodos(desdeMes, i), t);
    if (!porPeriodo.has(r.periodo)) porPeriodo.set(r.periodo, r);
  }
  for (const o of overrides) porPeriodo.set(o.periodo, { ...o });
  return [...porPeriodo.values()].sort((a, b) => (a.periodo < b.periodo ? -1 : 1));
}

/**
 * Primer resumen que incluye una compra: el de menor período cuyo cierre es >= la fecha
 * de compra (una compra del mismo día del cierre entra en ese resumen).
 */
export function calcularResumen(
  fechaCompra: Fecha,
  tarjeta: ConfigTarjeta,
  overrides: CierreOverride[] = [],
): Resumen {
  validarFecha(fechaCompra);
  validarTarjeta(tarjeta);
  // El cierre del mes de la compra o el del mes siguiente siempre es >= la compra.
  const candidatos = resumenesDesde(
    sumarPeriodos(periodoDe(fechaCompra), -1),
    4,
    tarjeta,
    overrides,
  );
  const resumen = candidatos.find((r) => r.fechaCierre >= fechaCompra);
  if (!resumen) throw new Error(`No se encontró un resumen para la compra del ${fechaCompra}`);
  return resumen;
}

/** Fechas del resumen de un período (el override si existe; si no, las calculadas). */
export function resumenDelPeriodo(
  periodo: Periodo,
  tarjeta: ConfigTarjeta,
  overrides: CierreOverride[] = [],
): Resumen {
  validarTarjeta(tarjeta);
  const override = overrides.find((o) => o.periodo === periodo);
  if (override) return { ...override };
  for (let i = -2; i <= 0; i++) {
    const r = resumenPorDefecto(sumarPeriodos(periodo, i), tarjeta);
    if (r.periodo === periodo) return r;
  }
  // Solo con días que se pisan por el clamp de fin de mes (ej. cierre 28 y vencimiento 29
  // en febrero): vence ese mes y cierra el mes anterior.
  return {
    periodo,
    fechaCierre: fechaConDia(sumarPeriodos(periodo, -1), tarjeta.diaCierre),
    fechaVencimiento: fechaConDia(periodo, tarjeta.diaVencimiento),
  };
}

/** El próximo resumen a pagar: el primero cuyo vencimiento es hoy o posterior. */
export function proximoResumen(
  hoy: Fecha,
  tarjeta: ConfigTarjeta,
  overrides: CierreOverride[] = [],
): Resumen {
  validarFecha(hoy);
  let periodo = sumarPeriodos(periodoDe(hoy), -1);
  for (let i = 0; i < 4; i++, periodo = sumarPeriodos(periodo, 1)) {
    const r = resumenDelPeriodo(periodo, tarjeta, overrides);
    if (r.fechaVencimiento >= hoy) return r;
  }
  throw new Error(`No se encontró el próximo resumen desde el ${hoy}`);
}

/**
 * Cuotas de una compra: la 1 en el primer resumen que la incluye y la cuota n, n−1
 * resúmenes después. Montos con dividirEnCuotas (la última absorbe los centavos).
 */
export function generarCuotas(
  compra: CompraParaCuotas,
  tarjeta: ConfigTarjeta,
  overrides: CierreOverride[] = [],
): CuotaCalculada[] {
  const montos = dividirEnCuotas(compra.montoTotal, compra.cantidadCuotas);
  const primero = calcularResumen(compra.fecha, tarjeta, overrides);
  return montos.map((monto, i) => ({
    numero: i + 1,
    monto,
    periodoResumen: sumarPeriodos(primero.periodo, i),
  }));
}
