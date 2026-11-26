import { cn } from '@/lib/utils';

interface LogoProps {
  /** "claro" para fondos claros (EC negro), "oscuro" para barras azules (EC blanco). */
  fondo?: 'claro' | 'oscuro';
  conTexto?: boolean;
  className?: string;
}

/** Marca de EFE Capital: el EC del logo + "EFE CAPITAL" en Montserrat espaciada. */
export function Logo({ fondo = 'claro', conTexto = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src={fondo === 'oscuro' ? '/logo-white.png' : '/logo-mark.png'}
        alt={conTexto ? '' : 'EFE Capital'}
        className="h-9 w-9"
        width={36}
        height={36}
      />
      {conTexto && (
        <span
          className={cn(
            'font-display text-sm font-semibold uppercase tracking-[0.2em]',
            fondo === 'oscuro' ? 'text-sidebar-accent-foreground' : 'text-foreground',
          )}
        >
          EFE Capital
        </span>
      )}
    </span>
  );
}
