import { Injectable } from '@nestjs/common';
import { type Env } from './env';

/** Acceso tipado a la configuración ya validada. Se construye una sola vez al arrancar. */
@Injectable()
export class ConfigService {
  constructor(private readonly env: Env) {}

  get<K extends keyof Env>(clave: K): Env[K] {
    return this.env[clave];
  }

  get esProduccion(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get esDesarrollo(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get esTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }
}
