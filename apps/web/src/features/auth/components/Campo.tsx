import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CampoProps extends ComponentProps<'input'> {
  etiqueta: string;
  error?: string;
}

/** Label + input + mensaje de error, accesible (aria-invalid / aria-describedby). */
export const Campo = forwardRef<HTMLInputElement, CampoProps>(
  ({ etiqueta, error, type, ...props }, ref) => {
    const id = useId();
    const idError = `${id}-error`;
    const [ver, setVer] = useState(false);
    const esPassword = type === 'password';

    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{etiqueta}</Label>
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            type={esPassword && ver ? 'text' : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            className={esPassword ? 'pr-11' : undefined}
            {...props}
          />
          {esPassword && (
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && (
          <p id={idError} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Campo.displayName = 'Campo';
