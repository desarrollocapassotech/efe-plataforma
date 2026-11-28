import { mesEnCurso, periodoAFacturar } from '@efe/shared/asesoramiento';
import { sumarPeriodos } from '@efe/shared/fechas';
import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  type UsuarioDePrueba,
} from './helpers';

interface ClienteRes {
  id: string;
  faktiaReferencia: string;
  nombre: string;
  deshabilitadoEn: string | null;
  brokers: { id: string; nombre: string }[];
  usuario: { id: string } | null;
  suscripcion: {
    planId: string | null;
    desde: string;
    hasta: string | null;
    historial: { monto: string; desde: string }[];
    montoActual: string | null;
    activa: boolean;
    atrasado: boolean;
  } | null;
}

/** Tablas globales (no por usuario): todo lleva un sufijo único y se borra al final. */
describe('Asesoramiento: clientes, brokers, planes y servicios (e2e)', () => {
  let t: AppDePrueba;
  let admin: UsuarioDePrueba;
  let comun: UsuarioDePrueba;
  let sufijo: string;
  const actual = mesEnCurso();

  const como = (u: UsuarioDePrueba) => ({
    get: (r: string) =>
      request(t.server).get(`/api/v1/admin/asesoramiento${r}`).set('Authorization', u.auth),
    post: (r: string, b: object = {}) =>
      request(t.server)
        .post(`/api/v1/admin/asesoramiento${r}`)
        .set('Authorization', u.auth)
        .send(b),
    patch: (r: string, b: object) =>
      request(t.server)
        .patch(`/api/v1/admin/asesoramiento${r}`)
        .set('Authorization', u.auth)
        .send(b),
    put: (r: string, b: object) =>
      request(t.server).put(`/api/v1/admin/asesoramiento${r}`).set('Authorization', u.auth).send(b),
    delete: (r: string) =>
      request(t.server).delete(`/api/v1/admin/asesoramiento${r}`).set('Authorization', u.auth),
  });
  const api = () => como(admin);
  const codigo = (r: request.Response) => (r.body as { error: { code: string } }).error.code;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    admin = await crearUsuario(t.server, 'ases-admin');
    comun = await crearUsuario(t.server, 'ases-comun');
    sufijo = admin.firebaseUid.split('-').at(-1)!;
    await t.prisma.usuario.update({ where: { id: admin.id }, data: { rol: 'ADMIN' } });
  });

  afterAll(async () => {
    await t.prisma.clienteAsesoramiento.deleteMany({ where: { apellido: { endsWith: sufijo } } });
    await t.prisma.broker.deleteMany({ where: { nombre: { endsWith: sufijo } } });
    await t.prisma.planAsesoramiento.deleteMany({ where: { nombre: { endsWith: sufijo } } });
    await t.prisma.servicioAsesoramiento.deleteMany({ where: { nombre: { endsWith: sufijo } } });
    await t.prisma.auditoria.deleteMany({ where: { actorId: admin.id } });
    await borrarUsuarios(t.prisma, [admin, comun]);
    await t.app.close();
  });

  it('solo ADMIN', async () => {
    for (const r of ['/clientes', '/brokers', '/planes', '/servicios']) {
      await como(comun).get(r).expect(403);
      await request(t.server).get(`/api/v1/admin/asesoramiento${r}`).expect(401);
    }
  });

  let bmb: string;
  let iol: string;
  let plan: string;
  let ana: ClienteRes;

  it('brokers: alta con referencia de Faktia, nombre único sin mayúsculas, renombrar', async () => {
    const res = await api()
      .post('/brokers', { nombre: `BMB ${sufijo}` })
      .expect(201);
    bmb = (res.body as { id: string }).id;
    expect((res.body as { faktiaReferencia: string }).faktiaReferencia).toMatch(/^broker:/);
    iol = (
      (
        await api()
          .post('/brokers', { nombre: `IOL ${sufijo}` })
          .expect(201)
      ).body as { id: string }
    ).id;
    const dup = await api()
      .post('/brokers', { nombre: `bmb ${sufijo}` })
      .expect(409);
    expect(codigo(dup)).toBe('BROKER_DUPLICADO');
    await api()
      .patch(`/brokers/${bmb}`, { nombre: `BMB Bursátil ${sufijo}` })
      .expect(200);
  });

  it('clientes: alta con brokers, filtros y edición', async () => {
    await api()
      .post('/clientes', { nombre: 'Ana', apellido: `Pérez ${sufijo}`, brokerIds: ['no-existe'] })
      .expect(404);
    const res = await api()
      .post('/clientes', {
        nombre: 'Ana',
        apellido: `Pérez ${sufijo}`,
        email: 'ana@test.efe',
        perfilInversor: 'MODERADO',
        brokerIds: [bmb, iol],
        fiscal: {
          tipoDocumento: 'DNI',
          numeroDocumento: '30111222',
          condicionIva: 'CONSUMIDOR_FINAL',
        },
      })
      .expect(201);
    ana = res.body as ClienteRes;
    expect(ana.faktiaReferencia).toBeTruthy();
    expect(ana.brokers.map((b) => b.id).sort()).toEqual([bmb, iol].sort());
    expect(ana.suscripcion).toBeNull();

    const porBroker = (await api().get(`/clientes?brokerId=${iol}`).expect(200))
      .body as ClienteRes[];
    expect(porBroker.map((c) => c.id)).toEqual([ana.id]);
    const porTexto = (await api().get(`/clientes?q=${sufijo}&perfil=MODERADO`).expect(200))
      .body as ClienteRes[];
    expect(porTexto).toHaveLength(1);

    const editado = (
      await api()
        .patch(`/clientes/${ana.id}`, { brokerIds: [iol], telefono: '1155556666' })
        .expect(200)
    ).body as ClienteRes;
    expect(editado.brokers.map((b) => b.id)).toEqual([iol]);
  });

  it('broker con clientes no se borra', async () => {
    const r = await api().delete(`/brokers/${iol}`).expect(409);
    expect(codigo(r)).toBe('BROKER_CON_CLIENTES');
    await api().delete(`/brokers/${bmb}`).expect(204);
  });

  it('planes: asignar (alta al precio del plan) y actualizar precio solo a los tildados', async () => {
    plan = (
      (
        await api()
          .post('/planes', { nombre: `Seguimiento ${sufijo}`, precio: '14900' })
          .expect(201)
      ).body as { id: string }
    ).id;
    const beto = (
      (
        await api()
          .post('/clientes', { nombre: 'Beto', apellido: `Gómez ${sufijo}` })
          .expect(201)
      ).body as ClienteRes
    ).id;

    const asignar = await api()
      .post(`/planes/${plan}/asignar`, { clienteIds: [ana.id, beto, 'no-existe'] })
      .expect(200);
    expect(asignar.body).toEqual({
      actualizados: [ana.id, beto],
      omitidos: [{ id: 'no-existe', motivo: 'No existe' }],
    });
    const anaConPlan = (await api().get(`/clientes/${ana.id}`).expect(200)).body as ClienteRes;
    expect(anaConPlan.suscripcion).toMatchObject({
      planId: plan,
      desde: actual,
      hasta: null,
      historial: [{ monto: '14900.00', desde: actual }],
      montoActual: '14900.00',
      activa: true,
      atrasado: false,
    });

    // Nuevo precio solo para Ana: Beto queda atrasado.
    const precio = await api()
      .post(`/planes/${plan}/precio`, { precio: '16000', clienteIds: [ana.id] })
      .expect(200);
    expect(precio.body).toEqual({ actualizados: [ana.id], omitidos: [] });
    const lista = (await api().get(`/clientes?planId=${plan}`).expect(200)).body as ClienteRes[];
    expect(lista.find((c) => c.id === ana.id)?.suscripcion).toMatchObject({
      montoActual: '16000.00',
      atrasado: false,
    });
    expect(lista.find((c) => c.id === beto)?.suscripcion).toMatchObject({
      montoActual: '14900.00',
      atrasado: true,
    });

    const planes = (await api().get('/planes').expect(200)).body as {
      id: string;
      precio: string;
      clientes: number;
    }[];
    expect(planes.find((p) => p.id === plan)).toMatchObject({ precio: '16000.00', clientes: 2 });
  });

  it('suscripción completa: valida coherencia', async () => {
    const malo = await api()
      .put(`/clientes/${ana.id}/suscripcion`, {
        planId: null,
        desde: actual,
        hasta: sumarPeriodos(actual, -2),
        historial: [{ monto: '1', desde: actual }],
      })
      .expect(422);
    expect(codigo(malo)).toBe('SUSCRIPCION_INVALIDA');
    const desde = sumarPeriodos(actual, -3);
    const ok = (
      await api()
        .put(`/clientes/${ana.id}/suscripcion`, {
          planId: plan,
          desde,
          hasta: null,
          historial: [
            { monto: '12000', desde },
            { monto: '16000', desde: actual },
          ],
        })
        .expect(200)
    ).body as ClienteRes;
    expect(ok.suscripcion?.historial).toEqual([
      { monto: '12000.00', desde },
      { monto: '16000.00', desde: actual },
    ]);
  });

  it('deshabilitar: baja lógica con baja de la suscripción al mes vencido; habilitar no la reactiva', async () => {
    const des = (
      await api()
        .post(`/clientes/${ana.id}/deshabilitar`, { motivo: 'Dejó el servicio' })
        .expect(200)
    ).body as ClienteRes;
    expect(des.deshabilitadoEn).toBeTruthy();
    expect(des.suscripcion?.hasta).toBe(periodoAFacturar(actual));
    expect(
      (await api().get(`/clientes?q=${sufijo}`).expect(200)).body as ClienteRes[],
    ).not.toContainEqual(expect.objectContaining({ id: ana.id }));
    expect(
      (
        (await api().get(`/clientes?q=${sufijo}&estado=deshabilitados`).expect(200))
          .body as ClienteRes[]
      ).map((c) => c.id),
    ).toEqual([ana.id]);

    // Deshabilitada no se le asigna plan.
    const asignar = await api()
      .post(`/planes/${plan}/asignar`, { clienteIds: [ana.id] })
      .expect(200);
    expect(asignar.body).toMatchObject({
      omitidos: [{ id: ana.id, motivo: 'Está deshabilitado' }],
    });

    const hab = (await api().post(`/clientes/${ana.id}/habilitar`).expect(200)).body as ClienteRes;
    expect(hab.deshabilitadoEn).toBeNull();
    expect(hab.suscripcion?.hasta).toBe(periodoAFacturar(actual));
    // Nunca se borra: no hay DELETE de clientes.
    await api().delete(`/clientes/${ana.id}`).expect(404);
  });

  it('vincular con un usuario de la plataforma le pone plan ASESORAMIENTO (auditado)', async () => {
    const res = (
      await api().put(`/clientes/${ana.id}/usuario`, { usuarioId: comun.id }).expect(200)
    ).body as ClienteRes;
    expect(res.usuario?.id).toBe(comun.id);
    const me = await request(t.server)
      .get('/api/v1/me')
      .set('Authorization', comun.auth)
      .expect(200);
    expect((me.body as { plan: string }).plan).toBe('ASESORAMIENTO');
    expect(
      await t.prisma.auditoria.count({
        where: { actorId: admin.id, accion: 'admin.vincular_cliente' },
      }),
    ).toBe(1);

    const otro = (
      (
        await api()
          .post('/clientes', { nombre: 'Caro', apellido: `Díaz ${sufijo}` })
          .expect(201)
      ).body as ClienteRes
    ).id;
    const dup = await api().put(`/clientes/${otro}/usuario`, { usuarioId: comun.id }).expect(409);
    expect(codigo(dup)).toBe('USUARIO_YA_VINCULADO');
    await api().put(`/clientes/${ana.id}/usuario`, { usuarioId: null }).expect(200);
  });

  it('servicios de pago único', async () => {
    const s = (
      await api()
        .post('/servicios', { nombre: `Diagnóstico ${sufijo}`, precio: '34900' })
        .expect(201)
    ).body as { id: string; precio: string };
    expect(s.precio).toBe('34900.00');
    await api().patch(`/servicios/${s.id}`, { precio: '39900' }).expect(200);
    await api().delete(`/servicios/${s.id}`).expect(204);
    await api().delete(`/servicios/${s.id}`).expect(404);
  });
});
