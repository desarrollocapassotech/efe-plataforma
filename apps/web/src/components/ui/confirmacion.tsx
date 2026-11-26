import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { Loader2 } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmacionProps {
  abierta: boolean;
  onAbiertaChange: (abierta: boolean) => void;
  titulo: string;
  mensaje: string;
  textoConfirmar: string;
  /** Rojo para acciones que no se pueden deshacer. */
  destructiva?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
}

/** Confirmación de una acción (Radix AlertDialog): explica la consecuencia antes de hacerla. */
export function Confirmacion({
  abierta,
  onAbiertaChange,
  titulo,
  mensaje,
  textoConfirmar,
  destructiva,
  cargando,
  onConfirmar,
}: ConfirmacionProps) {
  return (
    <AlertDialogPrimitive.Root open={abierta} onOpenChange={onAbiertaChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg bg-card p-5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="space-y-2">
            <AlertDialogPrimitive.Title className="text-lg font-semibold">
              {titulo}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
              {mensaje}
            </AlertDialogPrimitive.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'outline' }))}>
              Cancelar
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              disabled={cargando}
              onClick={onConfirmar}
              className={cn(buttonVariants({ variant: destructiva ? 'destructive' : 'default' }))}
            >
              {cargando && <Loader2 className="animate-spin" />}
              {textoConfirmar}
            </button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
