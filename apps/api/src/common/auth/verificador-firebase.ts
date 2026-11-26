import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { ConfigService } from '../../config/config.service';
import { type IdentidadToken, VerificadorToken } from './verificador-token';

/**
 * Producción y desarrollo: verifica el ID token con firebase-admin.
 * Vive en su propio archivo y se carga con import() dinámico: firebase-admin depende de
 * `jose` (solo ESM), que Node 22 carga bien pero Jest no. Los tests nunca lo importan.
 */
export class VerificadorFirebase extends VerificadorToken {
  private readonly auth: Auth;

  constructor(config: ConfigService) {
    super();
    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert({
          projectId: config.get('FIREBASE_PROJECT_ID'),
          clientEmail: config.get('FIREBASE_CLIENT_EMAIL'),
          // En Render la clave suele quedar con "\n" literales: se convierten a saltos reales.
          privateKey: config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        }),
      });
    this.auth = getAuth(app);
  }

  async verificar(token: string): Promise<IdentidadToken> {
    const decodificado = await this.auth.verifyIdToken(token);
    return { firebaseUid: decodificado.uid, email: decodificado.email };
  }
}
