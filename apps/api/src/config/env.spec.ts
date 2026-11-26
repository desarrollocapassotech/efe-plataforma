import { validarEnv } from './env';

const DB = {
  DATABASE_URL: 'postgresql://u:p@host-pooler/db?sslmode=require',
  DIRECT_URL: 'postgresql://u:p@host/db?sslmode=require',
};
const FIREBASE = {
  FIREBASE_PROJECT_ID: 'efecapitaladmin',
  FIREBASE_CLIENT_EMAIL: 'sa@efecapitaladmin.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
};
const BASE = { ...DB, ...FIREBASE };

describe('validarEnv', () => {
  it('aplica defaults en desarrollo', () => {
    const env = validarEnv({ ...BASE });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'http://localhost:5174']);
  });

  it('sin DATABASE_URL falla diciendo qué falta', () => {
    expect(() => validarEnv({ ...FIREBASE, DIRECT_URL: DB.DIRECT_URL })).toThrow(
      /DATABASE_URL: falta definirla/,
    );
  });

  it('una variable vacía cuenta como faltante', () => {
    expect(() => validarEnv({ ...BASE, DATABASE_URL: '' })).toThrow(
      /DATABASE_URL: falta definirla/,
    );
  });

  it('rechaza URLs que no son de Postgres y no muestra el valor', () => {
    let mensaje = '';
    try {
      validarEnv({ ...BASE, DIRECT_URL: 'mysql://u:secreto@host/db' });
    } catch (e) {
      mensaje = (e as Error).message;
    }
    expect(mensaje).toMatch(/DIRECT_URL/);
    expect(mensaje).not.toMatch(/secreto/);
  });

  it('parsea CORS_ORIGINS separado por comas', () => {
    const env = validarEnv({ ...BASE, CORS_ORIGINS: 'https://a.com, https://b.com,' });
    expect(env.CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
  });

  it('fuera de tests exige la service account de Firebase', () => {
    expect(() => validarEnv({ ...DB })).toThrow(
      /FIREBASE_PROJECT_ID[\s\S]*FIREBASE_CLIENT_EMAIL[\s\S]*FIREBASE_PRIVATE_KEY/,
    );
  });

  it('en tests no exige Firebase', () => {
    expect(validarEnv({ ...DB, NODE_ENV: 'test' }).NODE_ENV).toBe('test');
  });

  it('en producción exige JOBS_SECRET', () => {
    expect(() => validarEnv({ ...BASE, NODE_ENV: 'production' })).toThrow(
      /JOBS_SECRET: Obligatoria en producción/,
    );
  });
});
