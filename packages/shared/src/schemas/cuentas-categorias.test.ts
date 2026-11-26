import { describe, expect, it } from 'vitest';
import {
  ActualizarCategoriaSchema,
  ActualizarCuentaSchema,
  ColorSchema,
  CrearCategoriaSchema,
  CrearCuentaSchema,
  ImporteSchema,
  ListarCategoriasQuerySchema,
  ListarCuentasQuerySchema,
  OrdenCategoriasSchema,
} from './index';

describe('ImporteSchema y ColorSchema', () => {
  it('importe acepta negativos, cero y hasta 2 decimales', () => {
    for (const v of ['0', '-0.5', '1234.56', '-9999999999999999.99']) {
      expect(ImporteSchema.safeParse(v).success, v).toBe(true);
    }
    for (const v of ['', '1.234', '1,5', '--1', '+1', '1e3']) {
      expect(ImporteSchema.safeParse(v).success, v).toBe(false);
    }
  });

  it('color #RRGGBB, normalizado a mayúsculas', () => {
    expect(ColorSchema.parse('#2e4a8b')).toBe('#2E4A8B');
    for (const v of ['2E4A8B', '#FFF', '#GGGGGG', 'red']) {
      expect(ColorSchema.safeParse(v).success, v).toBe(false);
    }
  });
});

describe('cuentas', () => {
  it('crear con defaults', () => {
    expect(CrearCuentaSchema.parse({ nombre: ' Banco ' })).toEqual({
      nombre: 'Banco',
      tipo: 'OTRA',
      moneda: 'ARS',
      saldoInicial: '0',
    });
  });

  it('crear rechaza campos desconocidos y usuarioId', () => {
    expect(CrearCuentaSchema.safeParse({ nombre: 'x', usuarioId: 'otro' }).success).toBe(false);
    expect(CrearCuentaSchema.safeParse({ nombre: '' }).success).toBe(false);
    expect(CrearCuentaSchema.safeParse({ nombre: 'x', moneda: 'EUR' }).success).toBe(false);
    expect(CrearCuentaSchema.safeParse({ nombre: 'x', saldoInicial: 100 }).success).toBe(false);
  });

  it('actualizar parcial, no vacío', () => {
    expect(ActualizarCuentaSchema.parse({ archivada: true })).toEqual({ archivada: true });
    expect(ActualizarCuentaSchema.safeParse({}).success).toBe(false);
  });

  it('query incluirArchivadas desde string', () => {
    expect(ListarCuentasQuerySchema.parse({})).toEqual({ incluirArchivadas: false });
    expect(ListarCuentasQuerySchema.parse({ incluirArchivadas: 'true' })).toEqual({
      incluirArchivadas: true,
    });
    expect(ListarCuentasQuerySchema.parse({ incluirArchivadas: 'false' })).toEqual({
      incluirArchivadas: false,
    });
  });
});

describe('categorías', () => {
  it('crear exige tipo, nombre, color e ícono', () => {
    expect(
      CrearCategoriaSchema.parse({ tipo: 'GASTO', nombre: 'Café', color: '#aa00bb', icono: '☕' }),
    ).toEqual({ tipo: 'GASTO', nombre: 'Café', color: '#AA00BB', icono: '☕' });
    expect(
      CrearCategoriaSchema.safeParse({ tipo: 'GASTO', nombre: 'x', color: '#000000' }).success,
    ).toBe(false);
    expect(
      CrearCategoriaSchema.safeParse({ tipo: 'OTRO', nombre: 'x', color: '#000000', icono: 'x' })
        .success,
    ).toBe(false);
  });

  it('acepta emojis compuestos', () => {
    expect(
      CrearCategoriaSchema.safeParse({
        tipo: 'INGRESO',
        nombre: 'x',
        color: '#000000',
        icono: '🧑‍💻',
      }).success,
    ).toBe(true);
  });

  it('actualizar no deja cambiar el tipo', () => {
    expect(ActualizarCategoriaSchema.safeParse({ tipo: 'INGRESO' }).success).toBe(false);
    expect(ActualizarCategoriaSchema.parse({ archivada: true })).toEqual({ archivada: true });
  });

  it('orden en lote sin repetidos', () => {
    expect(
      OrdenCategoriasSchema.safeParse([
        { id: 'a', orden: 0 },
        { id: 'b', orden: 1 },
      ]).success,
    ).toBe(true);
    expect(
      OrdenCategoriasSchema.safeParse([
        { id: 'a', orden: 0 },
        { id: 'a', orden: 1 },
      ]).success,
    ).toBe(false);
    expect(OrdenCategoriasSchema.safeParse([]).success).toBe(false);
  });

  it('query con tipo opcional', () => {
    expect(ListarCategoriasQuerySchema.parse({ tipo: 'GASTO' })).toEqual({
      tipo: 'GASTO',
      incluirArchivadas: false,
    });
    expect(ListarCategoriasQuerySchema.safeParse({ tipo: 'gasto' }).success).toBe(false);
  });
});
