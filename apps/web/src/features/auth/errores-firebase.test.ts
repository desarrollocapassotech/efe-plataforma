import { describe, expect, it } from 'vitest';
import { mensajeErrorFirebase } from './errores-firebase';

describe('mensajeErrorFirebase', () => {
  it('traduce los errores comunes', () => {
    expect(mensajeErrorFirebase({ code: 'auth/email-already-in-use' })).toMatch(
      /Ya hay una cuenta/,
    );
    expect(mensajeErrorFirebase({ code: 'auth/weak-password' })).toMatch(/muy débil/);
    expect(mensajeErrorFirebase({ code: 'auth/invalid-credential' })).toMatch(/no son correctos/);
    expect(mensajeErrorFirebase({ code: 'auth/too-many-requests' })).toMatch(/demasiados intentos/);
  });

  it('no muestra nada si el usuario cerró el popup de Google', () => {
    expect(mensajeErrorFirebase({ code: 'auth/popup-closed-by-user' })).toBeNull();
  });

  it('mensaje genérico para errores desconocidos', () => {
    expect(mensajeErrorFirebase({ code: 'auth/algo-nuevo' })).toBe(
      'Ocurrió un error. Probá de nuevo.',
    );
    expect(mensajeErrorFirebase(new Error('x'))).toBe('Ocurrió un error. Probá de nuevo.');
  });
});
