import type { ReactNode } from 'react';

/** Aviso de error dentro de un formulario (borde izquierdo + fondo suave, como en el admin). */
export function AlertaError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-md border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-sm text-foreground"
    >
      {children}
    </div>
  );
}

export function AlertaExito({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="rounded-md border-l-2 border-success bg-success/10 px-3 py-2 text-sm text-foreground"
    >
      {children}
    </div>
  );
}
