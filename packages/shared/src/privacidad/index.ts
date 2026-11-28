// Limpieza de datos personales antes de mandar errores a Sentry (ARCHITECTURE §9):
// nunca emails ni montos en mensajes, breadcrumbs ni datos extra.

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
/** Montos: "$ 1.234,56", "US$ 10", "1234.50", "1.234.567" (números con separadores o decimales). */
const MONTO = /(US\$|\$)\s?\d[\d.,]*|\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\b|\b\d+[.,]\d{1,2}\b/g;

/** Reemplaza emails y montos por marcadores. */
export function ocultarDatosSensibles(texto: string): string {
  return texto.replace(EMAIL, '[email]').replace(MONTO, '[monto]');
}

/** Aplica `ocultarDatosSensibles` a todos los strings de un valor (objetos y arrays incluidos). */
export function limpiarProfundo<T>(valor: T, profundidad = 0): T {
  if (profundidad > 8) return valor;
  if (typeof valor === 'string') return ocultarDatosSensibles(valor) as T;
  if (Array.isArray(valor)) return valor.map((v) => limpiarProfundo(v, profundidad + 1)) as T;
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(
      Object.entries(valor).map(([k, v]) => [k, limpiarProfundo(v, profundidad + 1)]),
    ) as T;
  }
  return valor;
}
