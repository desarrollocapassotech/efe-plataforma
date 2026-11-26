import { hoy, periodoDe, sumarPeriodos } from '@efe/shared/fechas';
import { calcularAvance } from '@efe/shared/objetivos';
import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  type UsuarioDePrueba,
} from './helpers';

interface ObjetivoRes {
  id: string;
  nombre: string;
  estado: string;
  montoObjetivo: string;
  avance: { acumulado: string; porcentaje: string; faltante: string; enCamino: boolean };
  aportes?: { id: string; monto: string; fecha: string }[];
}

describe('Objetivos (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;
  let viaje: string;

  const hoyAr = hoy();
  const fechaObjetivo = `${sumarPeriodos(periodoDe(hoyAr), 6)}-15`;
  const haceUnAnio = `${sumarPeriodos(periodoDe(hoyAr), -12)}-10`;

  const api = (u: UsuarioDePrueba) => ({
    get: (ruta: string) => request(t.server).get(`/api/v1${ruta}`).set('Authorization', u.auth),
    post: (ruta: string, body: object) =>
      request(t.server).post(`/api/v1${ruta}`).set('Authorization', u.auth).send(body),
    patch: (ruta: string, body: object) =>
      request(t.server).patch(`/api/v1${ruta}`).set('Authorization', u.auth).send(body),
    delete: (ruta: string) =>
      request(t.server).delete(`/api/v1${ruta}`).set('Authorization', u.auth),
  });
  const codigo = (r: request.Response) => (r.body as { error: { code: string } }).error.code;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'objetivos-a');
    b = await crearUsuario(t.server, 'objetivos-b');
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('crea un objetivo con su avance en cero y valida los datos', async () => {
    await api(a).post('/objetivos', { nombre: 'Viaje', montoObjetivo: '0' }).expect(400);
    await api(a).post('/objetivos', { nombre: 'Viaje', montoObjetivo: 1000 }).expect(400);
    await api(a)
      .post('/objetivos', { nombre: 'Viaje', montoObjetivo: '1000', usuarioId: b.id })
      .expect(400);

    const res = await api(a)
      .post('/objetivos', {
        nombre: 'Viaje a Brasil',
        icono: '✈️',
        montoObjetivo: '1200000',
        moneda: 'ARS',
        fechaObjetivo,
      })
      .expect(201);
    const o = res.body as ObjetivoRes;
    viaje = o.id;
    expect(o).toMatchObject({
      nombre: 'Viaje a Brasil',
      estado: 'ACTIVO',
      montoObjetivo: '1200000.00',
      avance: { acumulado: '0.00', porcentaje: '0.00', faltante: '1200000.00', enCamino: false },
    });
  });

  it('los aportes (y retiros) suman al avance, igual que el cálculo de shared', async () => {
    await api(a).post(`/objetivos/${viaje}/aportes`, { monto: '0', fecha: hoyAr }).expect(400);
    await api(a)
      .post(`/objetivos/${viaje}/aportes`, { monto: '200000', fecha: haceUnAnio })
      .expect(201);
    await api(a)
      .post(`/objetivos/${viaje}/aportes`, { monto: '350000', fecha: hoyAr, nota: 'Aguinaldo' })
      .expect(201);
    await api(a).post(`/objetivos/${viaje}/aportes`, { monto: '-50000', fecha: hoyAr }).expect(201);

    const res = await api(a).get(`/objetivos/${viaje}`).expect(200);
    const o = res.body as ObjetivoRes & { avance: Record<string, unknown> };
    expect(o.avance).toEqual(
      calcularAvance({
        montoObjetivo: '1200000.00',
        acumulado: '500000.00',
        aportadoUltimosMeses: '300000.00', // el de hace un año no cuenta para el ritmo
        fechaObjetivo,
        aporteMensualPlaneado: null,
        hoy: hoyAr,
      }),
    );
    expect(o.aportes).toHaveLength(3);
    expect(o.aportes![0]!.fecha).toBe(hoyAr);

    const lista = await api(a).get('/objetivos').expect(200);
    expect((lista.body as ObjetivoRes[])[0]!.avance.acumulado).toBe('500000.00');
  });

  it('solo se marca cumplido al llegar al 100 %', async () => {
    const r = await api(a).patch(`/objetivos/${viaje}`, { estado: 'CUMPLIDO' }).expect(422);
    expect(codigo(r)).toBe('OBJETIVO_INCOMPLETO');

    await api(a).post(`/objetivos/${viaje}/aportes`, { monto: '700000', fecha: hoyAr }).expect(201);
    const ok = await api(a).patch(`/objetivos/${viaje}`, { estado: 'CUMPLIDO' }).expect(200);
    expect(ok.body).toMatchObject({ estado: 'CUMPLIDO', avance: { porcentaje: '100.00' } });
  });

  it('borrar un aporte recalcula; la moneda no cambia con aportes', async () => {
    const detalle = (await api(a).get(`/objetivos/${viaje}`).expect(200)).body as ObjetivoRes;
    const ultimo = detalle.aportes![0]!;
    await api(a).delete(`/objetivos/${viaje}/aportes/${ultimo.id}`).expect(204);
    await api(a).delete(`/objetivos/${viaje}/aportes/${ultimo.id}`).expect(404);
    const despues = (await api(a).get(`/objetivos/${viaje}`).expect(200)).body as ObjetivoRes;
    expect(despues.avance.acumulado).toBe('500000.00');

    const r = await api(a).patch(`/objetivos/${viaje}`, { moneda: 'USD' }).expect(409);
    expect(codigo(r)).toBe('OBJETIVO_MONEDA_BLOQUEADA');
  });

  it('archivado no recibe aportes; borrar elimina todo', async () => {
    const res = await api(a)
      .post('/objetivos', { nombre: 'Auto', montoObjetivo: '5000', moneda: 'USD' })
      .expect(201);
    const id = (res.body as ObjetivoRes).id;
    await api(a).patch(`/objetivos/${id}`, { estado: 'ARCHIVADO' }).expect(200);
    const r = await api(a)
      .post(`/objetivos/${id}/aportes`, { monto: '10', fecha: hoyAr })
      .expect(422);
    expect(codigo(r)).toBe('OBJETIVO_ARCHIVADO');
    await api(a).delete(`/objetivos/${id}`).expect(204);
    await api(a).get(`/objetivos/${id}`).expect(404);
  });

  it('aislamiento: otro usuario no ve ni toca objetivos ni aportes ajenos', async () => {
    const aporte = await t.prisma.aporteObjetivo.findFirstOrThrow({ where: { objetivoId: viaje } });
    expect((await api(b).get('/objetivos').expect(200)).body).toEqual([]);
    await api(b).get(`/objetivos/${viaje}`).expect(404);
    await api(b).patch(`/objetivos/${viaje}`, { nombre: 'Mío' }).expect(404);
    await api(b).delete(`/objetivos/${viaje}`).expect(404);
    await api(b).post(`/objetivos/${viaje}/aportes`, { monto: '1', fecha: hoyAr }).expect(404);
    await api(b).delete(`/objetivos/${viaje}/aportes/${aporte.id}`).expect(404);

    const intacto = await t.prisma.objetivo.findUniqueOrThrow({ where: { id: viaje } });
    expect(intacto.nombre).toBe('Viaje a Brasil');
    expect(await t.prisma.aporteObjetivo.count({ where: { objetivoId: viaje } })).toBe(3);
  });
});
