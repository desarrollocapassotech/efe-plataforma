import { hoy } from '@efe/shared/fechas';
import type { Categoria, Cuenta } from '@efe/shared/schemas';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormularioMovimiento } from './FormularioMovimiento';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api }));

const cuenta = (id: string, nombre: string, moneda: 'ARS' | 'USD' = 'ARS'): Cuenta => ({
  id,
  nombre,
  tipo: 'EFECTIVO',
  moneda,
  color: null,
  saldoInicial: '0.00',
  saldoActual: '0.00',
  archivada: false,
  orden: 0,
  creadoEn: '2026-11-01T00:00:00.000Z',
});

const categoria = (id: string, nombre: string, tipo: 'GASTO' | 'INGRESO'): Categoria => ({
  id,
  nombre,
  tipo,
  icono: '🛒',
  color: '#1F3A5F',
  esDefault: true,
  orden: 0,
  archivada: false,
});

const CUENTAS = [cuenta('c1', 'Efectivo'), cuenta('c2', 'Banco')];
const CATEGORIAS = [categoria('g1', 'Alimentación', 'GASTO'), categoria('i1', 'Sueldo', 'INGRESO')];

function renderizar(onListo = vi.fn()) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FormularioMovimiento
          inicial={{ tipo: 'GASTO' }}
          cuentas={CUENTAS}
          categorias={CATEGORIAS}
          onListo={onListo}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), onListo };
}

describe('FormularioMovimiento (carga rápida)', () => {
  beforeEach(() => {
    api.mockReset();
    api.mockResolvedValue({});
    localStorage.clear();
  });

  it('carga un gasto con defaults: hoy y la primera cuenta, y la recuerda', async () => {
    const { user, onListo } = renderizar();
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '1500');
    await user.click(screen.getByRole('radio', { name: 'Alimentación' }));
    await user.click(screen.getByRole('button', { name: 'Guardar gasto' }));

    expect(onListo).toHaveBeenCalled();
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/movimientos', {
        method: 'POST',
        body: {
          tipo: 'GASTO',
          monto: '1500',
          cuentaId: 'c1',
          categoriaId: 'g1',
          fecha: hoy(),
          descripcion: null,
        },
      }),
    );
    expect(localStorage.getItem('efe:ultimaCuenta')).toBe('c1');
  });

  it('usa la última cuenta recordada', async () => {
    localStorage.setItem('efe:ultimaCuenta', 'c2');
    renderizar();
    expect(screen.getByRole('radio', { name: /Banco/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('sin monto no guarda y avisa', async () => {
    const { user, onListo } = renderizar();
    await user.click(screen.getByRole('button', { name: 'Guardar gasto' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Poné cuánto fue.');
    expect(onListo).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
  });

  it('al pasar a ingreso muestra las categorías de ingreso', async () => {
    const { user } = renderizar();
    await user.click(screen.getByRole('radio', { name: 'Ingreso' }));
    expect(screen.getByRole('radio', { name: 'Sueldo' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Alimentación' })).not.toBeInTheDocument();
  });

  it('"se repite todos los meses" crea una recurrencia con el día de la fecha', async () => {
    const { user, onListo } = renderizar();
    await user.click(screen.getByRole('radio', { name: 'Ingreso' }));
    await user.type(screen.getByRole('textbox', { name: 'Monto' }), '900000');
    await user.click(screen.getByRole('radio', { name: 'Sueldo' }));
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Guardar ingreso' }));

    await waitFor(() => expect(onListo).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith('/recurrencias', {
      method: 'POST',
      body: expect.objectContaining({
        tipo: 'INGRESO',
        monto: '900000',
        descripcion: 'Sueldo',
        frecuencia: 'MENSUAL',
        diaDelMes: Number(hoy().slice(8, 10)),
        desde: hoy(),
      }),
    });
  });
});
