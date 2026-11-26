import { cn } from '@/lib/utils';

interface IconoCategoriaProps {
  icono: string;
  color: string;
  tamano?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TAMANOS = { sm: 'h-9 w-9 text-lg', md: 'h-12 w-12 text-2xl', lg: 'h-16 w-16 text-3xl' };

/** Emoji de la categoría sobre un círculo suave de su color (el color de la categoría es dato). */
export function IconoCategoria({ icono, color, tamano = 'md', className }: IconoCategoriaProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-2',
        TAMANOS[tamano],
        className,
      )}
      style={{ backgroundColor: `${color}1F`, borderColor: color }}
      aria-hidden
    >
      {icono}
    </span>
  );
}
