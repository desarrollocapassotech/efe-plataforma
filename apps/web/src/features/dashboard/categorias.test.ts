import type { GastoPorCategoria } from '@efe/shared/schemas';
import { describe, expect, it } from 'vitest';
import { resumirCategorias } from './categorias';

const cat = (id: string, total: string, porcentaje: string): GastoPorCategoria => ({
  categoriaId: id,
  nombre: id,
  color: '#000000',
  icono: '🛒',
  total,
  porcentaje,
});

describe('resumirCategorias', () => {
  it('con pocas categorías no junta nada', () => {
    const lista = [cat('a', '60.00', '60.00'), cat('b', '40.00', '40.00')];
    expect(resumirCategorias(lista, '100.00', 5)).toEqual(lista);
  });

  it('junta el resto en "Otras" con su total y porcentaje', () => {
    const lista = [
      cat('a', '50.00', '50.00'),
      cat('b', '20.00', '20.00'),
      cat('c', '15.00', '15.00'),
      cat('d', '10.00', '10.00'),
      cat('e', '5.00', '5.00'),
    ];
    const filas = resumirCategorias(lista, '100.00', 2);
    expect(filas.map((f) => f.categoriaId)).toEqual(['a', 'b', null]);
    expect(filas[2]).toMatchObject({
      nombre: 'Otras 3',
      total: '30.00',
      porcentaje: '30.00',
      otras: true,
    });
  });
});
