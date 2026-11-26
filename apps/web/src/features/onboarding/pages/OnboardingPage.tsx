import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useActualizarMe } from '@/features/perfil/hooks';

// Provisorio: el onboarding real (nombre, moneda, primera cuenta) es el paso 2.5.
// Por ahora solo permite marcarlo como completado para poder entrar a la app.
export function OnboardingPage() {
  const actualizar = useActualizarMe();

  const continuar = () =>
    actualizar.mutate({ onboardingCompletado: true }, { onError: (e) => toast.error(e.message) });

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <Card className="w-full max-w-sm overflow-hidden">
        <div className="brand-bar h-1" aria-hidden />
        <CardHeader>
          <CardTitle>¡Bienvenido a EFE Capital!</CardTitle>
          <CardDescription>
            En unos pasos vas a configurar tu cuenta. Por ahora, entrá a conocer la app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={continuar} disabled={actualizar.isPending}>
            {actualizar.isPending && <Loader2 className="animate-spin" />}
            Empezar
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
