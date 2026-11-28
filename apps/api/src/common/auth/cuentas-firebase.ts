import { ConfigService } from '../../config/config.service';

/** Operaciones sobre la cuenta de Firebase del usuario (baja de cuenta, purga). */
export abstract class CuentasFirebase {
  /** Cierra todas las sesiones: los refresh tokens dejan de servir. */
  abstract revocarSesiones(firebaseUid: string): Promise<void>;
  /** Borra el usuario de Firebase (purga a los 30 días). Si ya no existe, no falla. */
  abstract borrarUsuario(firebaseUid: string): Promise<void>;
}

/** SOLO tests: registra las llamadas en memoria (no hay Firebase en los e2e). */
export class CuentasFirebaseDePrueba extends CuentasFirebase {
  readonly revocadas: string[] = [];
  readonly borradas: string[] = [];

  revocarSesiones(firebaseUid: string): Promise<void> {
    this.revocadas.push(firebaseUid);
    return Promise.resolve();
  }

  borrarUsuario(firebaseUid: string): Promise<void> {
    this.borradas.push(firebaseUid);
    return Promise.resolve();
  }
}

export async function crearCuentasFirebase(config: ConfigService): Promise<CuentasFirebase> {
  if (config.esTest) return new CuentasFirebaseDePrueba();
  // Mismo motivo que el verificador: firebase-admin solo se carga fuera de Jest.
  const { CuentasFirebaseAdmin } = await import('./verificador-firebase.js');
  return new CuentasFirebaseAdmin(config);
}
