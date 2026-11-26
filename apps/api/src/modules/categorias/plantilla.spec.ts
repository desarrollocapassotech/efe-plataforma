import { categoriasDefaultPara, PALETA_CATEGORIAS, PLANTILLA_CATEGORIAS } from './plantilla';

describe('plantilla de categorías', () => {
  const gastos = PLANTILLA_CATEGORIAS.filter((c) => c.tipo === 'GASTO');
  const ingresos = PLANTILLA_CATEGORIAS.filter((c) => c.tipo === 'INGRESO');

  it('tiene las 13 de gasto y las 5 de ingreso del plan', () => {
    expect(gastos.map((c) => c.nombre)).toEqual([
      'Vivienda',
      'Alimentación',
      'Transporte',
      'Servicios',
      'Salud',
      'Entretenimiento',
      'Salidas',
      'Educación',
      'Ropa',
      'Regalos',
      'Impuestos',
      'Mascotas',
      'Otros',
    ]);
    expect(ingresos.map((c) => c.nombre)).toEqual([
      'Sueldo',
      'Honorarios',
      'Alquileres',
      'Ventas',
      'Otros ingresos',
    ]);
  });

  it('nombres únicos por tipo (respeta @@unique([usuarioId, tipo, nombre]))', () => {
    for (const lista of [gastos, ingresos]) {
      expect(new Set(lista.map((c) => c.nombre)).size).toBe(lista.length);
    }
  });

  it('dentro de cada tipo no se repiten colores, todos hex de la paleta', () => {
    const paleta = new Set<string>(Object.values(PALETA_CATEGORIAS));
    for (const lista of [gastos, ingresos]) {
      expect(new Set(lista.map((c) => c.color)).size).toBe(lista.length);
      for (const c of lista) {
        expect(c.color).toMatch(/^#[0-9A-F]{6}$/);
        expect(paleta.has(c.color)).toBe(true);
      }
    }
  });

  it('orden correlativo por tipo y con ícono', () => {
    expect(gastos.map((c) => c.orden)).toEqual(gastos.map((_, i) => i));
    expect(ingresos.map((c) => c.orden)).toEqual(ingresos.map((_, i) => i));
    for (const c of PLANTILLA_CATEGORIAS) expect(c.icono.length).toBeGreaterThan(0);
  });

  it('categoriasDefaultPara asigna usuario y marca esDefault', () => {
    const filas = categoriasDefaultPara('u1');
    expect(filas).toHaveLength(18);
    expect(filas.every((f) => f.usuarioId === 'u1' && f.esDefault)).toBe(true);
  });
});
