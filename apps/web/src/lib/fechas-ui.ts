import { hoy as hoyAR, sumarDias, type Fecha, type Periodo } from '@efe/shared/fechas';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

function partes(fecha: Fecha) {
  const [a, m, d] = fecha.split('-').map(Number) as [number, number, number];
  return { anio: a, mes: m, dia: d };
}

/** "Noviembre 2026" (o "Noviembre" si es del año de `hoy`). */
export function nombrePeriodo(periodo: Periodo, hoy: Fecha = hoyAR()): string {
  const [anio, mes] = periodo.split('-').map(Number) as [number, number];
  const nombre = capitalizar(MESES[mes - 1]!);
  return String(anio) === hoy.slice(0, 4) ? nombre : `${nombre} ${anio}`;
}

/** "nov" o "nov 25" para ejes de gráficos. */
export function periodoCorto(periodo: Periodo, conAnio = false): string {
  const [anio, mes] = periodo.split('-').map(Number) as [number, number];
  const nombre = MESES_CORTOS[mes - 1]!;
  return conAnio ? `${nombre} ${String(anio).slice(2)}` : nombre;
}

/** "5 de marzo" (sin año). */
export function diaYMes(dia: number, mes: number): string {
  return `${dia} de ${MESES[mes - 1]}`;
}

/** "Hoy", "Ayer" o "Jueves 26 de noviembre" (con año si no es el de `hoy`). */
export function nombreDia(fecha: Fecha, hoy: Fecha = hoyAR()): string {
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDias(hoy, -1)) return 'Ayer';
  const { anio, mes, dia } = partes(fecha);
  const diaSemana = DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()]!;
  const base = `${capitalizar(diaSemana)} ${diaYMes(dia, mes)}`;
  return String(anio) === hoy.slice(0, 4) ? base : `${base} de ${anio}`;
}

/** "26/11/2026" (corta, para listas y campos). */
export function fechaCorta(fecha: Fecha): string {
  const { anio, mes, dia } = partes(fecha);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;
}
