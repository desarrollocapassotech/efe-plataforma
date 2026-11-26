import type { Moneda } from '@efe/shared/dinero';
import { forwardRef, useState } from 'react';
import { procesarEntradaMonto, textoDesdeValor } from '@/lib/montos';
import { cn } from '@/lib/utils';

const SIMBOLO: Record<Moneda, string> = { ARS: '$', USD: 'US$' };

interface MoneyInputProps {
  id?: string;
  /** Valor decimal para la API ("1234.56") o '' si está vacío. */
  value: string;
  onChange: (valor: string) => void;
  moneda?: Moneda;
  permitirNegativo?: boolean;
  /** Grande para la carga de montos (el número es lo importante). */
  tamano?: 'normal' | 'grande';
  autoFocus?: boolean;
  placeholder?: string;
  invalido?: boolean;
  'aria-describedby'?: string;
}

/**
 * Campo de monto: abre el teclado numérico en el celular y formatea en es-AR mientras se
 * escribe ("1.234,56"). Devuelve el string decimal que espera la API.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      value,
      onChange,
      moneda = 'ARS',
      permitirNegativo = false,
      tamano = 'normal',
      invalido,
      placeholder = '0',
      ...props
    },
    ref,
  ) => {
    const [texto, setTexto] = useState(() => textoDesdeValor(value));
    // Si el valor cambia desde afuera (ej. reset del formulario), se muestra ese.
    const opciones = { permitirNegativo };
    const mostrado =
      procesarEntradaMonto(texto, opciones).valor === value ? texto : textoDesdeValor(value);

    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border border-input bg-card px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          tamano === 'grande' ? 'h-16' : 'h-11',
          invalido && 'border-destructive',
        )}
      >
        <span
          className={cn(
            'shrink-0 font-medium text-muted-foreground',
            tamano === 'grande' ? 'text-2xl' : 'text-base',
          )}
          aria-hidden
        >
          {SIMBOLO[moneda]}
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          placeholder={placeholder}
          aria-invalid={invalido ? true : undefined}
          value={mostrado}
          onChange={(e) => {
            const { texto: nuevo, valor } = procesarEntradaMonto(e.target.value, opciones);
            setTexto(nuevo);
            onChange(valor);
          }}
          className={cn(
            'w-full min-w-0 bg-transparent font-semibold tabular-nums outline-none placeholder:text-muted-foreground/60',
            tamano === 'grande' ? 'text-3xl' : 'text-base',
          )}
          {...props}
        />
      </div>
    );
  },
);
MoneyInput.displayName = 'MoneyInput';
