import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../auth-context';
import { LoginPage } from './LoginPage';

function renderizar(parcial: Partial<AuthContextValue> = {}) {
  const auth: AuthContextValue = {
    usuario: null,
    cargando: false,
    errorRedirect: null,
    loginEmail: vi.fn().mockResolvedValue(undefined),
    loginGoogle: vi.fn().mockResolvedValue(undefined),
    registrar: vi.fn(),
    recuperarPassword: vi.fn(),
    logout: vi.fn(),
    ...parcial,
  };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
  return { auth, user: userEvent.setup() };
}

describe('LoginPage', () => {
  it('muestra el formulario, Google y los links de registro y recuperación', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: 'Ingresá' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar con Google/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Creá una gratis' })).toHaveAttribute(
      'href',
      '/registro',
    );
    expect(screen.getByRole('link', { name: /Olvidaste/ })).toHaveAttribute('href', '/recuperar');
  });

  it('valida antes de llamar a Firebase', async () => {
    const { auth, user } = renderizar();
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Ingresá un email válido')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(auth.loginEmail).not.toHaveBeenCalled();
  });

  it('ingresa con email (normalizado) y contraseña', async () => {
    const { auth, user } = renderizar();
    await user.type(screen.getByLabelText('Email'), '  Elias@Mail.com ');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(auth.loginEmail).toHaveBeenCalledWith('elias@mail.com', 'secreta123');
  });

  it('traduce el error de Firebase', async () => {
    const { user } = renderizar({
      loginEmail: vi.fn().mockRejectedValue({ code: 'auth/invalid-credential' }),
    });
    await user.type(screen.getByLabelText('Email'), 'a@b.com');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El email o la contraseña no son correctos.',
    );
  });

  it('cerrar el popup de Google no muestra error', async () => {
    const { auth, user } = renderizar({
      loginGoogle: vi.fn().mockRejectedValue({ code: 'auth/popup-closed-by-user' }),
    });
    await user.click(screen.getByRole('button', { name: /Continuar con Google/ }));
    expect(auth.loginGoogle).toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('el botón de mostrar contraseña alterna la visibilidad', async () => {
    const { user } = renderizar();
    const campo = screen.getByLabelText('Contraseña');
    expect(campo).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(campo).toHaveAttribute('type', 'text');
  });
});
