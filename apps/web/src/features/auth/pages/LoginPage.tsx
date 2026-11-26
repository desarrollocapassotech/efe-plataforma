import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../auth-context';
import { AlertaError } from '../components/AlertaError';
import { AuthLayout } from '../components/AuthLayout';
import { BotonGoogle, Separador } from '../components/BotonGoogle';
import { Campo } from '../components/Campo';
import { mensajeErrorFirebase } from '../errores-firebase';
import { type LoginForm, LoginSchema } from '../schemas';

export function LoginPage() {
  const { loginEmail, loginGoogle, errorRedirect } = useAuth();
  const [error, setError] = useState<string | null>(
    errorRedirect ? mensajeErrorFirebase(errorRedirect) : null,
  );
  const [conGoogle, setConGoogle] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema) });

  // Al loguearse, PublicOnly redirige solo: acá no hace falta navegar.
  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await loginEmail(email, password);
    } catch (e) {
      setError(mensajeErrorFirebase(e));
    }
  });

  const onGoogle = async () => {
    setError(null);
    setConGoogle(true);
    try {
      await loginGoogle();
    } catch (e) {
      setError(mensajeErrorFirebase(e));
    } finally {
      setConGoogle(false);
    }
  };

  return (
    <AuthLayout
      titulo="Ingresá"
      descripcion="Tus finanzas personales, ordenadas."
      pie={
        <>
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="font-medium text-primary hover:underline">
            Creá una gratis
          </Link>
        </>
      }
    >
      <BotonGoogle onClick={onGoogle} cargando={conGoogle} disabled={isSubmitting} />
      <Separador />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <AlertaError>{error}</AlertaError>}
        <Campo
          etiqueta="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <Link to="/recuperar" className="text-sm text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || conGoogle}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Ingresar
        </Button>
      </form>
    </AuthLayout>
  );
}
