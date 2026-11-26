import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../auth-context';
import { AlertaError, AlertaExito } from '../components/AlertaError';
import { AuthLayout } from '../components/AuthLayout';
import { Campo } from '../components/Campo';
import { mensajeErrorFirebase } from '../errores-firebase';
import { type RecuperarForm, RecuperarSchema } from '../schemas';

export function RecuperarPage() {
  const { recuperarPassword } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarForm>({ resolver: zodResolver(RecuperarSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await recuperarPassword(email);
      setEnviadoA(email);
    } catch (e) {
      // Si el email no existe, Firebase no avisa (para no revelar cuentas): igual que éxito.
      const mensaje = mensajeErrorFirebase(e);
      if ((e as { code?: string }).code === 'auth/user-not-found') setEnviadoA(email);
      else setError(mensaje);
    }
  });

  return (
    <AuthLayout
      titulo="Recuperá tu contraseña"
      descripcion="Te mandamos un link para crear una nueva."
      pie={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Volver a ingresar
        </Link>
      }
    >
      {enviadoA ? (
        <AlertaExito>
          Si hay una cuenta con <strong>{enviadoA}</strong>, te llega un email con el link en unos
          minutos. Revisá también la carpeta de spam.
        </AlertaExito>
      ) : (
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Mandar link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
