import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  abierto: boolean;
  onAbiertoChange: (abierto: boolean) => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  /** Acciones fijas al pie (ej. Guardar). */
  pie?: ReactNode;
}

/**
 * Panel para crear o editar: en el celular es una hoja que sube desde abajo (cómoda para
 * el pulgar); en pantallas grandes, un diálogo centrado. Base: Radix Dialog (accesible:
 * foco atrapado, Escape cierra, lector de pantalla).
 */
export function Panel({
  abierto,
  onAbiertoChange,
  titulo,
  descripcion,
  children,
  pie,
}: PanelProps) {
  return (
    <DialogPrimitive.Root open={abierto} onOpenChange={onAbiertoChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 flex max-h-[92dvh] flex-col bg-card text-card-foreground shadow-lg',
            // Móvil: hoja inferior
            'inset-x-0 bottom-0 rounded-t-2xl pb-[env(safe-area-inset-bottom)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: diálogo centrado
            'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:pb-0',
            'md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0 md:data-[state=closed]:fade-out-0 md:data-[state=open]:fade-in-0',
          )}
        >
          <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted md:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-lg font-semibold">
                {titulo}
              </DialogPrimitive.Title>
              {descripcion ? (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {descripcion}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {titulo}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              className="-mr-2 -mt-1 flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {pie && <div className="border-t px-5 py-4">{pie}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Pie fijo dentro del contenido de un Panel (para el botón principal de un formulario):
 * queda siempre visible abajo, sin tener que scrollear. Va al final del formulario.
 */
export function PieFijo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('sticky -bottom-5 z-10 -mx-5 -mb-5 border-t bg-card px-5 pb-8 pt-3', className)}
    >
      {children}
    </div>
  );
}
