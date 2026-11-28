import { hoy } from '@efe/shared/fechas';
import { TERMINOS_VERSION } from '@efe/shared/schemas';
import request from 'supertest';
import { CuentasFirebase, type CuentasFirebaseDePrueba } from '../src/common/auth/cuentas-firebase';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  type UsuarioDePrueba,
} from './helpers';

const SECRETO = 'secreto-de-jobs-para-los-e2e-de-efe-plataforma';
const DIA_MS = 86_400_000;

describe('Privacidad: términos, exportación, baja, recuperación y purga (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;
  let firebase: CuentasFirebaseDePrueba;

  const api = (u: UsuarioDePrueba) => ({
    get: (r: string) => request(t.server).get(`/api/v1${r}`).set('Authorization', u.auth),
    post: (r: string, body: object = {}) =>
      request(t.server).post(`/api/v1${r}`).set('Authorization', u.auth).send(body),
    delete: (r: string, body: object = {}) =>
      request(t.server).delete(`/api/v1${r}`).set('Authorization', u.auth).send(body),
  });
  const codigo = (r: request.Response) => (r.body as { error: { code: string } }).error.code;

  beforeAll(async () => {
    process.env.JOBS_SECRET = SECRETO;
    t = await crearAppDePrueba();
    firebase = t.app.get(CuentasFirebase) as CuentasFirebaseDePrueba;
    a = await crearUsuario(t.server, 'priv-a');
    b = await crearUsuario(t.server, 'priv-b');

    // Datos de A en varias tablas, para la exportación.
    const cuenta = await api(a)
      .post('/cuentas', { nombre: 'Banco', saldoInicial: '1000' })
      .expect(201);
    const cuentaId = (cuenta.body as { id: string }).id;
    await api(a)
      .post('/movimientos', { cuentaId, tipo: 'GASTO', monto: '150.50', fecha: hoy() })
      .expect(201);
    const tarjeta = await api(a)
      .post('/tarjetas', { nombre: 'Visa', diaCierre: 25, diaVencimiento: 5 })
      .expect(201);
    await api(a)
      .post('/tarjetas/compras', {
        tarjetaId: (tarjeta.body as { id: string }).id,
        descripcion: 'Heladera',
        fecha: hoy(),
        montoTotal: '300',
        cantidadCuotas: 3,
      })
      .expect(201);
    const objetivo = await api(a)
      .post('/objetivos', { nombre: 'Viaje', montoObjetivo: '1000' })
      .expect(201);
    await api(a)
      .post(`/objetivos/${(objetivo.body as { id: string }).id}/aportes`, {
        monto: '100',
        fecha: hoy(),
      })
      .expect(201);
    // B también tiene datos: no tienen que aparecer en la exportación de A.
    await api(b).post('/cuentas', { nombre: 'Cuenta de B' }).expect(201);
  });

  afterAll(async () => {
    await t.prisma.auditoria.deleteMany({ where: { usuarioId: { in: [a.id, b.id] } } });
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('términos: se registra la versión vigente y la fecha; otra versión es inválida', async () => {
    const inicial = await api(a).get('/me').expect(200);
    expect(inicial.body).toMatchObject({ terminosVersion: null, terminosAceptadosEn: null });

    await api(a).post('/me/terminos', { version: 'vieja' }).expect(400);
    const res = await api(a).post('/me/terminos', { version: TERMINOS_VERSION }).expect(200);
    expect(res.body).toMatchObject({ terminosVersion: TERMINOS_VERSION });
    expect((res.body as { terminosAceptadosEn: string }).terminosAceptadosEn).toBeTruthy();
    expect(
      await t.prisma.auditoria.count({
        where: { usuarioId: a.id, accion: 'usuario.aceptar_terminos' },
      }),
    ).toBe(1);
  });

  it('exportación: trae todos los datos del usuario (y solo los suyos), auditada', async () => {
    const res = await api(a).get('/me/exportar').expect(200);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="efe-mis-datos-.*\.json"/,
    );
    const e = res.body as Record<string, unknown[]> & {
      usuario: Record<string, unknown>;
      categorias: unknown[];
      compras: unknown[];
    };
    expect(e.usuario).toMatchObject({ id: a.id, email: a.email });
    expect(e.usuario).not.toHaveProperty('firebaseUid');
    expect(e.cuentas).toHaveLength(1);
    expect(e.categorias.length).toBeGreaterThan(10);
    expect(e.movimientos).toEqual([expect.objectContaining({ monto: '150.50' })]);
    expect(e.tarjetas).toHaveLength(1);
    expect(e.compras).toEqual([
      expect.objectContaining({ cuotas: expect.arrayContaining([expect.anything()]) }),
    ]);
    expect((e.compras[0] as { cuotas: unknown[] }).cuotas).toHaveLength(3);
    expect(e.objetivos).toEqual([
      expect.objectContaining({ aportes: [expect.objectContaining({ monto: '100.00' })] }),
    ]);
    for (const clave of [
      'transferencias',
      'recurrencias',
      'pagosResumen',
      'perfiles',
      'suscripciones',
    ]) {
      expect(e[clave]).toEqual([]);
    }
    expect(JSON.stringify(e)).not.toContain('Cuenta de B');
    expect(
      await t.prisma.auditoria.count({ where: { usuarioId: a.id, accion: 'usuario.exportar' } }),
    ).toBe(1);
  });

  it('exportar tiene límite de 3 por hora (por IP y por ruta)', async () => {
    // En los e2e todos los requests salen de la misma IP: la exportación de A del test
    // anterior ya cuenta como 1.
    await api(b).get('/me/exportar').expect(200);
    await api(b).get('/me/exportar').expect(200);
    const r = await api(b).get('/me/exportar').expect(429);
    expect(codigo(r)).toBe('DEMASIADAS_SOLICITUDES');
  });

  it('baja: pide escribir ELIMINAR, revoca sesiones y bloquea el uso con la fecha de purga', async () => {
    await api(a).delete('/me', {}).expect(400);
    await api(a).delete('/me', { confirmacion: 'eliminar' }).expect(400);

    const res = await api(a).delete('/me', { confirmacion: 'ELIMINAR' }).expect(200);
    const purgaEn = new Date((res.body as { purgaEn: string }).purgaEn).getTime();
    expect(purgaEn - Date.now()).toBeGreaterThan(29 * DIA_MS);
    expect(firebase.revocadas).toContain(a.firebaseUid);

    const bloqueado = await api(a).get('/cuentas').expect(403);
    expect(codigo(bloqueado)).toBe('CUENTA_ELIMINADA');
    expect(
      (bloqueado.body as { error: { details: { purgaEn: string } } }).error.details.purgaEn,
    ).toBeTruthy();
    await api(a).get('/me').expect(403);
    expect(
      await t.prisma.auditoria.count({ where: { usuarioId: a.id, accion: 'cuenta.eliminar' } }),
    ).toBe(1);
  });

  it('recuperación: dentro de los 30 días vuelve todo como estaba', async () => {
    const res = await api(a).post('/me/restaurar').expect(200);
    expect(res.body).toMatchObject({ id: a.id });
    const cuentas = await api(a).get('/cuentas').expect(200);
    expect(cuentas.body).toHaveLength(1);
    expect(
      await t.prisma.auditoria.count({ where: { usuarioId: a.id, accion: 'cuenta.restaurar' } }),
    ).toBe(1);
    // Restaurar una cuenta activa no hace nada.
    await api(a).post('/me/restaurar').expect(200);
    expect(
      await t.prisma.auditoria.count({ where: { usuarioId: a.id, accion: 'cuenta.restaurar' } }),
    ).toBe(1);
  });

  it('purga: a los 30 días borra todo en Postgres y en Firebase; antes, no', async () => {
    // La baja por HTTP ya se probó (y su límite de 3 por hora ya se usó en este archivo).
    await t.prisma.usuario.update({ where: { id: a.id }, data: { eliminadoEn: new Date() } });
    const job = () =>
      request(t.server)
        .post('/api/v1/internal/jobs/purgar-cuentas')
        .set('X-Jobs-Secret', SECRETO)
        .expect(200);

    await job();
    expect(await t.prisma.usuario.findUnique({ where: { id: a.id } })).not.toBeNull();

    await t.prisma.usuario.update({
      where: { id: a.id },
      data: { eliminadoEn: new Date(Date.now() - 31 * DIA_MS) },
    });
    const res = await job();
    expect((res.body as { purgadas: number }).purgadas).toBeGreaterThanOrEqual(1);
    expect(await t.prisma.usuario.findUnique({ where: { id: a.id } })).toBeNull();
    expect(await t.prisma.movimiento.count({ where: { usuarioId: a.id } })).toBe(0);
    expect(await t.prisma.cuota.count({ where: { usuarioId: a.id } })).toBe(0);
    expect(firebase.borradas).toContain(a.firebaseUid);
    // La auditoría sobrevive al borrado.
    expect(
      await t.prisma.auditoria.count({ where: { usuarioId: a.id, accion: 'cuenta.purgar' } }),
    ).toBe(1);
    // B no se tocó.
    expect(await t.prisma.usuario.findUnique({ where: { id: b.id } })).not.toBeNull();
  });
});
