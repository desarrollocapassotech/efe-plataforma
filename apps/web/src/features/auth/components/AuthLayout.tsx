import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthLayoutProps {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  pie?: ReactNode;
}

/** Marco de las pantallas públicas (login, registro, recuperar). */
export function AuthLayout({ titulo, descripcion, children, pie }: AuthLayoutProps) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <Card className="w-full max-w-sm overflow-hidden">
        <div className="brand-bar h-1" aria-hidden />
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          {descripcion && <CardDescription>{descripcion}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {pie && <div className="mt-6 text-center text-sm text-muted-foreground">{pie}</div>}
    </main>
  );
}
