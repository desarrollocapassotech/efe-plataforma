import { COLORES_CATEGORIA } from '@efe/shared/categorias';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  etiqueta?: string;
}

/** Paleta cerrada de colores (los de la marca + colores bien distinguibles). */
export function ColorPicker({ value, onChange, etiqueta = 'Color' }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2.5">
      {COLORES_CATEGORIA.map((color) => {
        const elegido = value.toUpperCase() === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={elegido}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition',
              elegido && 'ring-2 ring-foreground',
            )}
            style={{ backgroundColor: color }}
          >
            {elegido && <Check className="h-4 w-4 text-primary-foreground" />}
          </button>
        );
      })}
    </div>
  );
}
