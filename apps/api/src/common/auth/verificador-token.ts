import { ConfigService } from '../../config/config.service';

export interface IdentidadToken {
  firebaseUid: string;
  email: string | undefined;
}

/** Verifica un ID token y devuelve la identidad. Tira si el token no es válido. */
export abstract class VerificadorToken {
  abstract verificar(token: string): Promise<IdentidadToken>;
}

/**
 * SOLO tests automatizados: acepta tokens falsos "test:<firebaseUid>:<email>".
 * Se elige únicamente con NODE_ENV=test, y main.ts se niega a arrancar con NODE_ENV=test:
 * un servidor real nunca puede aceptar estos tokens.
 */
export class VerificadorDePrueba extends VerificadorToken {
  verificar(token: string): Promise<IdentidadToken> {
    const partes = token.split(':');
    if (partes.length !== 3 || partes[0] !== 'test' || !partes[1]) {
      return Promise.reject(new Error('Token de prueba inválido'));
    }
    return Promise.resolve({ firebaseUid: partes[1], email: partes[2] || undefined });
  }
}

export async function crearVerificador(config: ConfigService): Promise<VerificadorToken> {
  if (config.esTest) return new VerificadorDePrueba();
  const { VerificadorFirebase } = await import('./verificador-firebase.js');
  return new VerificadorFirebase(config);
}
