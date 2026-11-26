import { esCero, formatearMoneda, type Moneda } from '@efe/shared/dinero';
import { cn } from '@/lib/utils';

interface CurrencyAmountProps {
  valor: string;
  moneda: Moneda;
  /** Rojo si es negativo (saldos). */
  colorearNegativo?: boolean;
  className?: string;
}

/** Monto formateado en es-AR ("$ 1.234,50", "US$ 1.234,50"), con cifras alineadas. */
export function CurrencyAmount({
  valor,
  moneda,
  colorearNegativo,
  className,
}: CurrencyAmountProps) {
  const negativo = valor.startsWith('-') && !esCero(valor);
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        colorearNegativo && negativo && 'text-destructive',
        className,
      )}
    >
      {formatearMoneda(valor, moneda)}
    </span>
  );
}
