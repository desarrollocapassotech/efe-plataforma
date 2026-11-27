import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context';
import { IndicadoresPage } from './IndicadoresPage';

const api = vi.hoisted(() =>
  vi.fn(async (ruta: string) =>
    ruta.includes('historico')
      ? { codigo: 'X', puntos: [] }
      : {
          valores: [
            {
              codigo: 'DOLAR_MEP_VENTA',
              fecha: '2026-11-26',
              valor: '1180.5',
              fuente: 'DolarApi (dolarhoy.com)',
              urlFuente: null,
              obtenidoEn: '2026-11-26T16:00:00.000Z',
              anterior: null,
              variacion: null,
            },
          ],
          brechaMep: { valor: '12.43', fecha: '2026-11-26' },
          brechaCcl: null,
          ipcAcumuladoAnio: null,
        },
  ),
);
vi.mock('@/lib/api', () => ({ api }));

const sinSesion = {
  usuario: null,
  cargando: false,
  errorRedirect: null,
  loginEmail: vi.fn(),
  loginGoogle: vi.fn(),
  registrar: vi.fn(),
  recuperarPassword: vi.fn(),
  logout: vi.fn(),
} satisfies AuthContextValue;

describe('IndicadoresPage sin sesión', () => {
  it('muestra los datos con fecha y fuente, y la invitación a registrarse', async () => {
    render(
      <AuthContext.Provider value={sinSesion}>
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <IndicadoresPage />
          </MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>,
    );
    expect(await screen.findByText(/1\.180,50/)).toBeInTheDocument();
    expect(screen.getByText(/Brecha 12/)).toBeInTheDocument();
    expect(screen.getByText(/Dato del 26\/11\/2026/)).toHaveTextContent('DolarApi (dolarhoy.com)');
    expect(screen.getByRole('link', { name: 'Crear mi cuenta' })).toHaveAttribute(
      'href',
      '/registro',
    );
    expect(api).toHaveBeenCalledWith('/indicadores');
  });
});
