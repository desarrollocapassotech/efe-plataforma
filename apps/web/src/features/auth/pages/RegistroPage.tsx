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
import { type RegistroForm, RegistroSchema } from '../schemas';

// TODO(7.1): checkbox obligatorio de términos y privacidad (versión + fecha de aceptación).
export function RegistroPage() {
  const { registrar, loginGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [conGoogle, setConGoogle] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroForm>({ resolver: zodResolver(RegistroSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await registrar(email, password);
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
      titulo="Creá tu cuenta"
      descripcion="Es gratis. Empezá a ordenar tus finanzas hoy."
      pie={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Ingresá
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Campo
          etiqueta="Repetí la contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmacion?.message}
          {...register('confirmacion')}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting || conGoogle}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
