import { dinero } from '@efe/shared/dinero';

/** "3,7 %" (con signo opcional: "+2,0 %"). Solo para mostrar. */
export function formatearPorcentaje(valor: string, decimales = 1, signo = false): string {
  const d = dinero(valor).toDecimalPlaces(decimales);
  const texto = d.abs().toFixed(decimales).replace('.', ',');
  const prefijo = d.isNegative() && !d.isZero() ? '-' : signo && !d.isZero() ? '+' : '';
  return `${prefijo}${texto}\u00a0%`;
}
