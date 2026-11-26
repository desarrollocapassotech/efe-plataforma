/**
 * Entrada de montos en formato es-AR mientras se escribe: "1.234,56".
 * - La coma es el separador decimal; los puntos de miles se agregan solos.
 * - Si se escribe un punto al final (teclados que tienen "." como decimal), se toma como coma.
 * - Hasta 2 decimales y 16 dígitos enteros (entra en Decimal(18, 2)).
 * El valor que sale es el string decimal que espera la API: "1234.56" ('' si está vacío).
 */
export interface EntradaMonto {
  /** Lo que se muestra en el input. */
  texto: string;
  /** Decimal para la API ("1234.56", "-50"), o '' si no hay número. */
  valor: string;
}

const agruparMiles = (entero: string) => entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function procesarEntradaMonto(
  crudo: string,
  { permitirNegativo = false }: { permitirNegativo?: boolean } = {},
): EntradaMonto {
  const negativo = permitirNegativo && /^\s*-/.test(crudo);
  let s = crudo;
  if (!s.includes(',') && s.endsWith('.')) s = `${s.slice(0, -1)},`;
  s = s.replace(/\./g, '').replace(/[^\d,]/g, '');

  const tieneComa = s.includes(',');
  const [enteroCrudo = '', ...resto] = s.split(',');
  const decimales = resto.join('').slice(0, 2);
  let entero = enteroCrudo.replace(/^0+(?=\d)/, '').slice(0, 16);
  if (entero === '' && tieneComa) entero = '0';

  const signo = negativo ? '-' : '';
  if (entero === '') return { texto: signo, valor: '' };
  return {
    texto: `${signo}${agruparMiles(entero)}${tieneComa ? `,${decimales}` : ''}`,
    valor: `${signo}${entero}${decimales ? `.${decimales}` : ''}`,
  };
}

/** Texto para mostrar un valor ya guardado: "1234.50" → "1.234,50". */
export function textoDesdeValor(valor: string): string {
  if (!valor) return '';
  const negativo = valor.startsWith('-');
  const [entero = '0', decimales] = valor.replace('-', '').split('.');
  return `${negativo ? '-' : ''}${agruparMiles(entero)}${decimales ? `,${decimales}` : ''}`;
}
