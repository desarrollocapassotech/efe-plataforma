import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { TERMINOS_VERSION } from '@efe/shared/schemas';
import { Button } from '@/components/ui/button';
import { guardarPreferencia, PREFERENCIA_TERMINOS } from '@/lib/preferencias';
import { useAuth } from '../auth-context';
import { AlertaError } from '../components/AlertaError';
import { AuthLayout } from '../components/AuthLayout';
import { BotonGoogle, Separador } from '../components/BotonGoogle';
import { Campo } from '../components/Campo';
import { mensajeErrorFirebase } from '../errores-firebase';
import { type RegistroForm, RegistroSchema } from '../schemas';

/**
 * Registro con checkbox obligatorio de términos y privacidad. La aceptación se registra en
 * la API (versión + fecha) apenas existe el usuario: ver PantallaTerminos.
 */
export function RegistroPage() {
  const { registrar, loginGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [conGoogle, setConGoogle] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<RegistroForm>({
    resolver: zodResolver(RegistroSchema),
    defaultValues: { acepto: false },
  });
  const recordarAceptacion = () => guardarPreferencia(PREFERENCIA_TERMINOS, TERMINOS_VERSION);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    recordarAceptacion();
    try {
      await registrar(email, password);
    } catch (e) {
      setError(mensajeErrorFirebase(e));
    }
  });

  const onGoogle = async () => {
    setError(null);
    if (!getValues('acepto')) {
      setError('Para crear la cuenta tenés que aceptar los términos y la política de privacidad.');
      return;
    }
    recordarAceptacion();
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
        <div className="space-y-1">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-primary"
              {...register('acepto')}
            />
            <span>
              Acepto los{' '}
              <Link to="/terminos" className="font-medium text-primary hover:underline">
                términos y condiciones
              </Link>{' '}
              y la{' '}
              <Link to="/privacidad" className="font-medium text-primary hover:underline">
                política de privacidad
              </Link>
              .
            </span>
          </label>
          {errors.acepto && (
            <p className="text-sm text-destructive" role="alert">
              {errors.acepto.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || conGoogle}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
