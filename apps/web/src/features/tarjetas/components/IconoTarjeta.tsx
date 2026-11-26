import type { TarjetaResumida } from '@efe/shared/schemas';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Tarjetita con el color elegido por el usuario (el color es dato: identifica la tarjeta). */
export function IconoTarjeta({
  tarjeta,
  className,
}: {
  tarjeta: Pick<TarjetaResumida, 'color'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
        className,
      )}
      style={tarjeta.color ? { backgroundColor: tarjeta.color } : undefined}
      aria-hidden
    >
      <CreditCard className="h-5 w-5 text-white" />
    </span>
  );
}
