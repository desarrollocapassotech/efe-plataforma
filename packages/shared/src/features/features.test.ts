import { describe, expect, it } from 'vitest';
import { FEATURES, FEATURES_POR_PLAN, PLANES, tieneFeature } from './index';

describe('features por plan', () => {
  it('FREE incluye lo básico y no lo premium', () => {
    expect(tieneFeature('FREE', 'finanzas')).toBe(true);
    expect(tieneFeature('FREE', 'tarjetas')).toBe(true);
    expect(tieneFeature('FREE', 'informes')).toBe(true);
    expect(tieneFeature('FREE', 'analizador_on')).toBe(false);
    expect(tieneFeature('FREE', 'asistente_ia')).toBe(false);
    expect(tieneFeature('FREE', 'asesoramiento')).toBe(false);
  });

  it('PREMIUM incluye todo FREE más lo premium, sin asesoramiento', () => {
    for (const f of FEATURES_POR_PLAN.FREE) expect(tieneFeature('PREMIUM', f)).toBe(true);
    expect(tieneFeature('PREMIUM', 'analizador_on')).toBe(true);
    expect(tieneFeature('PREMIUM', 'informes_exclusivos')).toBe(true);
    expect(tieneFeature('PREMIUM', 'asesoramiento')).toBe(false);
  });

  it('ASESORAMIENTO incluye todas las features', () => {
    for (const f of FEATURES) expect(tieneFeature('ASESORAMIENTO', f)).toBe(true);
    expect(FEATURES_POR_PLAN.ASESORAMIENTO).toHaveLength(FEATURES.length);
  });

  it('cada plan es superconjunto del anterior y sin duplicados', () => {
    for (let i = 1; i < PLANES.length; i++) {
      const anterior = FEATURES_POR_PLAN[PLANES[i - 1]!];
      const actual = FEATURES_POR_PLAN[PLANES[i]!];
      expect(actual.length).toBeGreaterThan(anterior.length);
      for (const f of anterior) expect(actual).toContain(f);
    }
    for (const plan of PLANES) {
      const lista = FEATURES_POR_PLAN[plan];
      expect(new Set(lista).size).toBe(lista.length);
    }
  });

  it('las listas no se pueden modificar', () => {
    expect(Object.isFrozen(FEATURES_POR_PLAN)).toBe(true);
    expect(Object.isFrozen(FEATURES_POR_PLAN.FREE)).toBe(true);
  });
});
