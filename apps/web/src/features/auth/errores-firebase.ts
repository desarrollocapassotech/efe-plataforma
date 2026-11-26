const MENSAJES: Record<string, string> = {
  'auth/email-already-in-use': 'Ya hay una cuenta con ese email. Probá ingresar.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/weak-password': 'La contraseña es muy débil. Usá al menos 8 caracteres.',
  'auth/missing-password': 'Ingresá tu contraseña.',
  'auth/invalid-credential': 'El email o la contraseña no son correctos.',
  'auth/wrong-password': 'El email o la contraseña no son correctos.',
  'auth/user-not-found': 'El email o la contraseña no son correctos.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada. Escribinos si creés que es un error.',
  'auth/too-many-requests':
    'Hubo demasiados intentos. Esperá unos minutos o recuperá tu contraseña.',
  'auth/network-request-failed': 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
  'auth/popup-blocked':
    'El navegador bloqueó la ventana de Google. Habilitá los popups y probá de nuevo.',
  'auth/account-exists-with-different-credential':
    'Ya tenés una cuenta con ese email. Ingresá con email y contraseña.',
  'auth/operation-not-allowed': 'Este método de ingreso no está habilitado.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado para ingresar.',
  'auth/expired-action-code': 'El link venció. Pedí uno nuevo.',
  'auth/invalid-action-code': 'El link no es válido o ya se usó. Pedí uno nuevo.',
};

/** Errores que no hay que mostrar: el usuario cerró la ventana de Google a propósito. */
const SILENCIOSOS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

function codigoDe(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/** Mensaje en español para un error de Firebase Auth, o null si no hay que mostrar nada. */
export function mensajeErrorFirebase(error: unknown): string | null {
  const codigo = codigoDe(error);
  if (codigo && SILENCIOSOS.has(codigo)) return null;
  return (codigo && MENSAJES[codigo]) || 'Ocurrió un error. Probá de nuevo.';
}
