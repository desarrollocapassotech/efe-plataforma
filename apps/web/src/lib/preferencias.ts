/**
 * Preferencias del navegador (comodidades, no datos): si el storage no está disponible
 * (modo privado, bloqueado), se ignora y se usan los defaults.
 */
const PREFIJO = 'efe:';

export function leerPreferencia(clave: string): string | null {
  try {
    return window.localStorage.getItem(PREFIJO + clave);
  } catch {
    return null;
  }
}

export function guardarPreferencia(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(PREFIJO + clave, valor);
  } catch {
    // Sin storage: no pasa nada, la próxima vez se usa el default.
  }
}
