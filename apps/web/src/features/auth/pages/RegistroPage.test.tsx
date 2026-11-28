import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TERMINOS_VERSION } from '@efe/shared/schemas';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { RegistroPage } from './RegistroPage';

function renderizar() {
  const auth: AuthContextValue = {
    usuario: null,
    cargando: false,
    errorRedirect: null,
    loginEmail: vi.fn(),
    loginGoogle: vi.fn().mockResolvedValue(undefined),
    registrar: vi.fn().mockResolvedValue(undefined),
    recuperarPassword: vi.fn(),
    logout: vi.fn(),
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <RegistroPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { auth, user: userEvent.setup() };
}

describe('RegistroPage: términos obligatorios', () => {
  beforeEach(() => localStorage.clear());

  it('sin tildar los términos no registra', async () => {
    const { auth, user } = renderizar();
    await user.type(screen.getByLabelText('Email'), 'nuevo@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.type(screen.getByLabelText('Repetí la contraseña'), 'clave-segura');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText(/tenés que aceptar los términos/)).toBeInTheDocument();
    expect(auth.registrar).not.toHaveBeenCalled();
  });

  it('con los términos tildados registra y recuerda la versión aceptada', async () => {
    const { auth, user } = renderizar();
    await user.type(screen.getByLabelText('Email'), 'nuevo@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'clave-segura');
    await user.type(screen.getByLabelText('Repetí la contraseña'), 'clave-segura');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(auth.registrar).toHaveBeenCalledWith('nuevo@test.com', 'clave-segura');
    expect(localStorage.getItem('efe:terminosAceptados')).toBe(TERMINOS_VERSION);
  });

  it('Google también exige los términos', async () => {
    const { auth, user } = renderizar();
    await user.click(screen.getByRole('button', { name: /Google/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/aceptar los términos/);
    expect(auth.loginGoogle).not.toHaveBeenCalled();
  });
});
