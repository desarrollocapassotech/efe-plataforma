/** Planes. Alineado con el enum `Plan` de Prisma. */
export const PLANES = ['FREE', 'PREMIUM', 'ASESORAMIENTO'] as const;
export type Plan = (typeof PLANES)[number];

/** Funcionalidades habilitables por plan (ARCHITECTURE §4). */
export const FEATURES = [
  'finanzas',
  'tarjetas',
  'objetivos',
  'indicadores',
  'perfil_inversor',
  'cartera_liquidez',
  'informes',
  'informes_exclusivos',
  'carteras_premium',
  'analizador_on',
  'mi_cartera_on',
  'alertas',
  'acciones',
  'asistente_ia',
  'asesoramiento',
] as const;
export type Feature = (typeof FEATURES)[number];

const SOLO_FREE = [
  'finanzas',
  'tarjetas',
  'objetivos',
  'indicadores',
  'perfil_inversor',
  'cartera_liquidez',
  'informes',
] as const satisfies readonly Feature[];

const SOLO_PREMIUM = [
  'informes_exclusivos',
  'carteras_premium',
  'analizador_on',
  'mi_cartera_on',
  'alertas',
  'acciones',
  'asistente_ia',
] as const satisfies readonly Feature[];

const SOLO_ASESORAMIENTO = ['asesoramiento'] as const satisfies readonly Feature[];

const FREE: readonly Feature[] = Object.freeze([...SOLO_FREE]);
const PREMIUM: readonly Feature[] = Object.freeze([...FREE, ...SOLO_PREMIUM]);
const ASESORAMIENTO: readonly Feature[] = Object.freeze([...PREMIUM, ...SOLO_ASESORAMIENTO]);

/** Cada plan incluye todo lo del anterior: FREE ⊂ PREMIUM ⊂ ASESORAMIENTO. */
export const FEATURES_POR_PLAN: Readonly<Record<Plan, readonly Feature[]>> = Object.freeze({
  FREE,
  PREMIUM,
  ASESORAMIENTO,
});

export function tieneFeature(plan: Plan, feature: Feature): boolean {
  return FEATURES_POR_PLAN[plan].includes(feature);
}
