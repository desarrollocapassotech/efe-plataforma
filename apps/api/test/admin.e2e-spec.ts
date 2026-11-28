import { hoy } from '@efe/shared/fechas';
import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  type UsuarioDePrueba,
} from './helpers';

interface PaginaRes<T> {
  items: T[];
  total: number;
  pagina: number;
  limite: number;
}
interface UsuarioRes {
  id: string;
  email: string;
  plan: string;
  rol: string;
  movimientos: number;
  eliminadoEn: string | null;
}

describe('Admin de la plataforma (e2e)', () => {
  let t: AppDePrueba;
  let admin: UsuarioDePrueba;
  let ana: UsuarioDePrueba;
  let beto: UsuarioDePrueba;
  /** Prefijo único de esta corrida: la base de tests es compartida. */
  let prefijo: string;

  const get = (u: UsuarioDePrueba, ruta: string) =>
    request(t.server).get(`/api/v1${ruta}`).set('Authorization', u.auth);

  beforeAll(async () => {
    t = await crearAppDePrueba();
    admin = await crearUsuario(t.server, 'admin-plat');
    ana = await crearUsuario(t.server, 'admin-ana');
    beto = await crearUsuario(t.server, 'admin-beto');
    prefijo = ana.firebaseUid.split('-').at(-1)!;
    await t.prisma.usuario.update({ where: { id: admin.id }, data: { rol: 'ADMIN' } });
    await t.prisma.usuario.update({
      where: { id: ana.id },
      data: { nombre: `Ana ${prefijo}`, onboardingCompletado: true },
    });

    // Ana carga 2 movimientos y un objetivo; Beto nada.
    const cuenta = await request(t.server)
      .post('/api/v1/cuentas')
      .set('Authorization', ana.auth)
      .send({ nombre: 'Efectivo' })
      .expect(201);
    const cuentaId = (cuenta.body as { id: string }).id;
    for (const monto of ['100', '200']) {
      await request(t.server)
        .post('/api/v1/movimientos')
        .set('Authorization', ana.auth)
        .send({ cuentaId, tipo: 'GASTO', monto, fecha: hoy() })
        .expect(201);
    }
    await request(t.server)
      .post('/api/v1/objetivos')
      .set('Authorization', ana.auth)
      .send({ nombre: 'Viaje', montoObjetivo: '1000' })
      .expect(201);
  });

  afterAll(async () => {
    await t.prisma.auditoria.deleteMany({ where: { actorId: admin.id } });
    await borrarUsuarios(t.prisma, [admin, ana, beto]);
    await t.app.close();
  });

  it('solo ADMIN: un usuario común recibe 403 y sin token 401', async () => {
    for (const ruta of [
      '/admin/usuarios',
      `/admin/usuarios/${ana.id}`,
      '/admin/metricas',
      '/admin/auditoria',
    ]) {
      await get(ana, ruta).expect(403);
      await request(t.server).get(`/api/v1${ruta}`).expect(401);
    }
    await request(t.server)
      .patch(`/api/v1/admin/usuarios/${beto.id}/plan`)
      .set('Authorization', ana.auth)
      .send({ plan: 'PREMIUM' })
      .expect(403);
  });

  it('lista usuarios con búsqueda, filtros, orden, paginación y cantidad de movimientos', async () => {
    const res = await get(admin, `/admin/usuarios?q=${prefijo}`).expect(200);
    const pagina = res.body as PaginaRes<UsuarioRes>;
    expect(pagina.total).toBe(1);
    expect(pagina.items[0]).toMatchObject({
      id: ana.id,
      movimientos: 2,
      plan: 'FREE',
      rol: 'USUARIO',
    });
    // Sin montos ni datos financieros en el listado.
    expect(Object.keys(pagina.items[0]!)).not.toContain('saldo');

    const admins = (await get(admin, '/admin/usuarios?rol=ADMIN&limite=100').expect(200))
      .body as PaginaRes<UsuarioRes>;
    expect(admins.items.map((u) => u.id)).toContain(admin.id);
    expect(admins.items.every((u) => u.rol === 'ADMIN')).toBe(true);

    const activos = (
      await get(admin, '/admin/usuarios?activoDias=1&q=e2e-admin&limite=100').expect(200)
    ).body as PaginaRes<UsuarioRes>;
    expect(activos.items.map((u) => u.id)).toEqual(expect.arrayContaining([ana.id, beto.id]));

    const p1 = (
      await get(admin, '/admin/usuarios?q=e2e-admin&orden=email&dir=asc&limite=1').expect(200)
    ).body as PaginaRes<UsuarioRes>;
    const p2 = (
      await get(admin, '/admin/usuarios?q=e2e-admin&orden=email&dir=asc&limite=1&pagina=2').expect(
        200,
      )
    ).body as PaginaRes<UsuarioRes>;
    expect(p1.total).toBeGreaterThanOrEqual(3);
    expect(p1.items[0]!.email < p2.items[0]!.email).toBe(true);

    await get(admin, '/admin/usuarios?limite=500').expect(400);
  });

  it('detalle: solo contadores', async () => {
    const res = await get(admin, `/admin/usuarios/${ana.id}`).expect(200);
    expect(res.body).toMatchObject({
      id: ana.id,
      contadores: {
        cuentas: 1,
        movimientos: 2,
        objetivos: 1,
        tarjetas: 0,
        compras: 0,
        recurrencias: 0,
      },
    });
    await get(admin, '/admin/usuarios/no-existe').expect(404);
  });

  it('cambio de plan auditado', async () => {
    const res = await request(t.server)
      .patch(`/api/v1/admin/usuarios/${beto.id}/plan`)
      .set('Authorization', admin.auth)
      .send({ plan: 'ASESORAMIENTO', motivo: 'Cliente de asesoramiento' })
      .expect(200);
    expect(res.body).toMatchObject({ id: beto.id, plan: 'ASESORAMIENTO' });

    // Beto ahora tiene las features del plan.
    const me = await request(t.server)
      .get('/api/v1/me')
      .set('Authorization', beto.auth)
      .expect(200);
    expect((me.body as { plan: string }).plan).toBe('ASESORAMIENTO');

    const auditoria = (await get(admin, `/admin/auditoria?usuarioId=${beto.id}`).expect(200))
      .body as PaginaRes<{
      accion: string;
      usuario: { id: string; email: string };
      actor: { id: string };
      datos: unknown;
    }>;
    expect(auditoria.total).toBe(1);
    expect(auditoria.items[0]).toMatchObject({
      accion: 'admin.cambiar_plan',
      usuario: { id: beto.id, email: beto.email },
      actor: { id: admin.id },
      datos: { anterior: 'FREE', nuevo: 'ASESORAMIENTO', motivo: 'Cliente de asesoramiento' },
    });

    const porAccion = (
      await get(admin, `/admin/auditoria?accion=cambiar_plan&desde=${hoy()}`).expect(200)
    ).body as PaginaRes<{ id: string }>;
    expect(porAccion.total).toBeGreaterThanOrEqual(1);

    await request(t.server)
      .patch(`/api/v1/admin/usuarios/${beto.id}/plan`)
      .set('Authorization', admin.auth)
      .send({ plan: 'ORO' })
      .expect(400);
  });

  it('métricas: totales, actividad, uso por módulo y series de 30 días', async () => {
    const res = await get(admin, '/admin/metricas').expect(200);
    const m = res.body as {
      totalUsuarios: number;
      activos7: number;
      conMovimientos: number;
      onboardingCompletado: string | null;
      registrosPorDia: { fecha: string; cantidad: number }[];
      movimientosPorDia: { fecha: string; cantidad: number }[];
      usoModulos: { conObjetivos: number };
    };
    // La base es compartida: se verifican mínimos y forma.
    expect(m.totalUsuarios).toBeGreaterThanOrEqual(2);
    expect(m.activos7).toBeGreaterThanOrEqual(2);
    expect(m.conMovimientos).toBeGreaterThanOrEqual(1);
    expect(m.usoModulos.conObjetivos).toBeGreaterThanOrEqual(1);
    expect(m.onboardingCompletado).not.toBeNull();
    expect(m.registrosPorDia).toHaveLength(30);
    expect(m.registrosPorDia.at(-1)!.fecha).toBe(hoy());
    expect(m.registrosPorDia.at(-1)!.cantidad).toBeGreaterThanOrEqual(2);
    expect(m.movimientosPorDia.at(-1)!.cantidad).toBeGreaterThanOrEqual(2);
  });
});
