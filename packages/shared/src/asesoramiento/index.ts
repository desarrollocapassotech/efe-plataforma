import { aString2Decimales, comparar } from '../dinero';
import { hoy, periodoDe, sumarPeriodos, type Periodo } from '../fechas';

// Reglas de negocio del asesoramiento (las de apps/admin/src/lib/{suscripciones,clientes,
// brokers}.ts y apps/admin/CLAUDE.md), puras y con montos como string decimal. El "mes en
// curso" se recibe como parámetro (por defecto, el de hoy en Argentina) para no depender
// del reloj ni de la zona horaria.

// ── Suscripciones ──────────────────────────────────────────────────────────────────────

export interface MontoVigente {
  /** String decimal ("14900.00"). */
  monto: string;
  /** Primer mes en que rige. */
  desde: Periodo;
}

export interface Suscripcion {
  planId: string | null;
  /** Mes de alta: se cobra completo. */
  desde: Periodo;
  /** Último mes facturado (baja). null: sigue activa. */
  hasta: Periodo | null;
  historial: MontoVigente[];
}

export interface PlanPrecio {
  id: string;
  precio: string;
}

export const mesEnCurso = (): Periodo => periodoDe(hoy());

/** Se factura mes vencido: en noviembre se factura octubre. */
export const periodoAFacturar = (actual: Periodo = mesEnCurso()): Periodo =>
  sumarPeriodos(actual, -1);

const ordenar = (h: readonly MontoVigente[]) =>
  [...h].sort((a, b) => a.desde.localeCompare(b.desde));

/** Monto que regía en un período (undefined si todavía no había ninguno). */
export function montoEn(s: Pick<Suscripcion, 'historial'>, p: Periodo): string | undefined {
  let monto: string | undefined;
  for (const v of ordenar(s.historial)) {
    if (v.desde <= p) monto = v.monto;
    else break;
  }
  return monto;
}

/** Monto vigente en el mes en curso (o el primero, si todos son futuros). */
export const montoActual = (
  s: Pick<Suscripcion, 'historial'>,
  actual: Periodo = mesEnCurso(),
): string | undefined => montoEn(s, actual) ?? ordenar(s.historial)[0]?.monto;

/**
 * Agrega un monto que rige desde `desde`: reemplaza el que empezaba ese mismo mes y
 * descarta los posteriores (quedaron pisados por el cambio).
 */
export const conNuevoMonto = (
  historial: readonly MontoVigente[],
  monto: string,
  desde: Periodo,
): MontoVigente[] => [
  ...ordenar(historial).filter((v) => v.desde < desde),
  { monto: aString2Decimales(monto), desde },
];

/** ¿Hay que facturarle ese período? */
export function facturableEn(s: Suscripcion | null | undefined, p: Periodo): boolean {
  if (!s || s.desde > p || (s.hasta !== null && p > s.hasta)) return false;
  const monto = montoEn(s, p);
  return monto !== undefined && comparar(monto, 0) > 0;
}

/** Activa: no se dio de baja antes del mes que se factura ahora. */
export const suscripcionActiva = (
  s: Suscripcion | null | undefined,
  actual: Periodo = mesEnCurso(),
): boolean => Boolean(s && (s.hasta === null || s.hasta >= periodoAFacturar(actual)));

/** Paga menos que el precio vigente de su plan. */
export function estaAtrasado(
  s: Suscripcion | null | undefined,
  planes: readonly PlanPrecio[],
  actual: Periodo = mesEnCurso(),
): boolean {
  if (!s?.planId) return false;
  const plan = planes.find((p) => p.id === s.planId);
  const monto = montoActual(s, actual);
  return Boolean(plan && monto !== undefined && comparar(monto, plan.precio) < 0);
}

/**
 * Último mes a facturar si se da de baja hoy: el mes vencido (que todavía se factura), o
 * el de alta si empezó después. null si no hay nada que cambiar.
 */
export function periodoBajaHoy(
  s: Suscripcion | null | undefined,
  actual: Periodo = mesEnCurso(),
): Periodo | null {
  if (!s) return null;
  const vencido = periodoAFacturar(actual);
  const hasta = s.desde > vencido ? s.desde : vencido;
  return s.hasta !== null && s.hasta <= hasta ? null : hasta;
}

/** Se puede asignar un plan sin tocar meses cerrados: sin suscripción o con una activa. */
export const puedeAsignarPlan = (
  s: Suscripcion | null | undefined,
  actual: Periodo = mesEnCurso(),
): boolean => !s || suscripcionActiva(s, actual);

/**
 * Suscripción con el plan asignado.
 * - Sin suscripción: alta en el mes en curso, al precio del plan.
 * - Con suscripción: cambia el plan; con `aplicarPrecio`, el precio rige desde el mes en
 *   curso (o desde el alta si todavía no empezó): la factura del mes vencido sale con el
 *   monto viejo.
 */
export function conPlan(
  s: Suscripcion | null | undefined,
  plan: PlanPrecio,
  aplicarPrecio: boolean,
  actual: Periodo = mesEnCurso(),
): Suscripcion {
  const precio = aString2Decimales(plan.precio);
  if (!s) {
    return {
      planId: plan.id,
      desde: actual,
      hasta: null,
      historial: [{ monto: precio, desde: actual }],
    };
  }
  const vigente = montoActual(s, actual);
  const historial =
    aplicarPrecio && (vigente === undefined || comparar(vigente, precio) !== 0)
      ? conNuevoMonto(s.historial, precio, s.desde > actual ? s.desde : actual)
      : ordenar(s.historial);
  return { ...s, planId: plan.id, historial };
}

/** Valida una suscripción completa (para PUT): fechas y montos coherentes. null si está bien. */
export function errorSuscripcion(s: Suscripcion): string | null {
  if (s.hasta !== null && s.hasta < s.desde) return 'La baja no puede ser anterior al alta';
  if (s.historial.length === 0) return 'Tiene que tener al menos un monto';
  if (new Set(s.historial.map((v) => v.desde)).size !== s.historial.length) {
    return 'Hay dos montos que empiezan el mismo mes';
  }
  if (s.historial.some((v) => comparar(v.monto, 0) < 0)) {
    return 'Los montos no pueden ser negativos';
  }
  return null;
}

// ── Clientes ───────────────────────────────────────────────────────────────────────────

/** Baja lógica: los clientes nunca se borran, se deshabilitan. */
export const clienteHabilitado = (c: { deshabilitadoEn: Date | string | null | undefined }) =>
  !c.deshabilitadoEn;

// ── Brokers ────────────────────────────────────────────────────────────────────────────

/** Brokers base. */
export const BROKERS_BASE = ['BMB', 'IOL', 'Balanz'] as const;

/** Variantes conocidas → nombre canónico (claves en minúsculas, sin acentos). */
const ALIAS_BROKERS: Record<string, string> = {
  bmb: 'BMB',
  iol: 'IOL',
  'invertir online': 'IOL',
  invertironline: 'IOL',
  balanz: 'Balanz',
  'balanz capital': 'Balanz',
};

const clave = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Separa un texto con varios brokers: "BMB y IOL", "BMB, IOL", "BMB / IOL", "BMB + IOL". */
export function separarBrokers(texto: unknown): string[] {
  if (typeof texto !== 'string') return [];
  return texto
    .split(/\s*(?:,|;|\/|\+|&|\s+y\s+|\s+e\s+)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Nombre canónico: alias conocidos, después coincidencia con `conocidos`, si no tal cual. */
export function nombreCanonicoBroker(nombre: string, conocidos: readonly string[] = []): string {
  const limpio = nombre.trim().replace(/\s+/g, ' ');
  const k = clave(limpio);
  return ALIAS_BROKERS[k] ?? conocidos.find((c) => clave(c) === k) ?? limpio;
}

/** Normaliza y deduplica una lista de brokers (cada valor puede traer varios juntos). */
export function normalizarBrokers(
  nombres: readonly string[],
  conocidos: readonly string[] = [],
): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const crudo of nombres) {
    for (const parte of separarBrokers(crudo)) {
      const nombre = nombreCanonicoBroker(parte, conocidos);
      const k = clave(nombre);
      if (!nombre || vistos.has(k)) continue;
      vistos.add(k);
      resultado.push(nombre);
    }
  }
  return resultado;
}

/** Brokers de un cliente de Firestore: el array `brokers` o, si falta, el texto legacy `broker`. */
export function brokersDeDatos(datos: { brokers?: unknown; broker?: unknown }): string[] {
  if (Array.isArray(datos.brokers)) {
    return normalizarBrokers(datos.brokers.filter((b): b is string => typeof b === 'string'));
  }
  return normalizarBrokers(separarBrokers(datos.broker));
}

export const mismoBroker = (a: string, b: string) => clave(a) === clave(b);
