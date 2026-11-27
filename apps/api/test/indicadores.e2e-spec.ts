import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  fecha,
  type UsuarioDePrueba,
} from './helpers';

const SECRETO = 'secreto-de-jobs-para-los-e2e-de-efe-plataforma';
const fixture = (nombre: string): unknown =>
  JSON.parse(readFileSync(resolve(__dirname, 'fixtures/indicadores', nombre), 'utf8'));

interface IndicadoresRes {
  valores: {
    codigo: string;
    fecha: string;
    valor: string;
    fuente: string;
    anterior: { fecha: string; valor: string } | null;
    variacion: string | null;
  }[];
  brechaMep: { valor: string; fecha: string } | null;
  brechaCcl: { valor: string; fecha: string } | null;
  ipcAcumuladoAnio: { valor: string; fecha: string; meses: number } | null;
}
interface IngestaRes {
  proveedores: { nombre: string; ok: boolean; error?: string }[];
  creados: number;
  actualizados: number;
  manualesConservados: number;
}

/**
 * Los fixtures usan fechas de 2099 para que estos datos sean siempre "los últimos" en la
 * base de tests compartida, y se borran al final.
 */
describe('Indicadores (e2e)', () => {
  let t: AppDePrueba;
  let admin: UsuarioDePrueba;
  let usuario: UsuarioDePrueba;
  let fetchMock: jest.SpyInstance;
  /** Respuesta simulada por host; `null` = la fuente está caída. */
  let respuestas: Record<string, unknown>;

  const correrJob = (job = 'indicadores') =>
    request(t.server).post(`/api/v1/internal/jobs/${job}`).set('X-Jobs-Secret', SECRETO);
  const resumen = async () =>
    (await request(t.server).get('/api/v1/indicadores').expect(200)).body as IndicadoresRes;
  const valor = (r: IndicadoresRes, codigo: string) => r.valores.find((v) => v.codigo === codigo);
  const limpiar = () =>
    t.prisma.indicador.deleteMany({ where: { fecha: { gte: fecha('2099-01-01') } } });

  beforeAll(async () => {
    process.env.JOBS_SECRET = SECRETO;
    t = await crearAppDePrueba();
    admin = await crearUsuario(t.server, 'indicadores-admin');
    usuario = await crearUsuario(t.server, 'indicadores-usuario');
    await t.prisma.usuario.update({ where: { id: admin.id }, data: { rol: 'ADMIN' } });
    await limpiar();
    // Las fuentes externas se simulan: el e2e no sale a internet.
    const fetchReal = global.fetch;
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (entrada, init) => {
      const url = String(entrada instanceof Request ? entrada.url : entrada);
      const host = new URL(url).host;
      if (!(host in respuestas)) return fetchReal(entrada, init);
      const cuerpo = respuestas[host];
      if (cuerpo === null) return new Response('caída', { status: 503 });
      return new Response(JSON.stringify(cuerpo), { status: 200 });
    });
  });

  beforeEach(() => {
    respuestas = {
      'dolarapi.com': fixture('dolarapi.json'),
      'apis.datos.gob.ar': fixture('series-ipc.json'),
      'api.argentinadatos.com': fixture('argentinadatos-inflacion.json'),
    };
  });

  afterAll(async () => {
    fetchMock.mockRestore();
    await limpiar();
    await t.prisma.auditoria.deleteMany({ where: { actorId: admin.id } });
    await borrarUsuarios(t.prisma, [admin, usuario]);
    await t.app.close();
  });

  it('el job ingesta dólares e IPC; GET /indicadores es público y calcula brechas e IPC acumulado', async () => {
    await request(t.server).post('/api/v1/internal/jobs/indicadores').expect(401);

    const job = (await correrJob().expect(200)).body as IngestaRes;
    expect(job.proveedores.every((p) => p.ok)).toBe(true);
    expect(job.creados).toBe(9); // 6 dólares + 3 meses de IPC

    // Sin Authorization: es público.
    const r = await resumen();
    expect(valor(r, 'DOLAR_OFICIAL_VENTA')).toMatchObject({
      fecha: '2099-03-10',
      valor: '1050',
      fuente: 'DolarApi (dolarhoy.com)',
      anterior: null,
      variacion: null,
    });
    expect(valor(r, 'IPC_MENSUAL')).toMatchObject({
      fecha: '2099-03-01',
      valor: '3.7',
      fuente: 'INDEC vía datos.gob.ar',
      anterior: { fecha: '2099-02-01', valor: '2.4' },
      variacion: '54.17',
    });
    expect(r.brechaMep).toEqual({ valor: '12.43', fecha: '2099-03-10' });
    expect(r.brechaCcl).toEqual({ valor: '15.00', fecha: '2099-03-10' });
    expect(r.ipcAcumuladoAnio).toEqual({ valor: '8.52', fecha: '2099-03-01', meses: 3 });
  });

  it('correr el job dos veces no duplica', async () => {
    const job = (await correrJob().expect(200)).body as IngestaRes;
    expect(job).toMatchObject({ creados: 0, actualizados: 0 });
    expect(await t.prisma.indicador.count({ where: { fecha: { gte: fecha('2099-01-01') } } })).toBe(
      9,
    );
  });

  it('fuente caída: el job sigue con las otras, conserva el último valor y el IPC usa el respaldo', async () => {
    respuestas['dolarapi.com'] = null;
    respuestas['apis.datos.gob.ar'] = null;
    const job = (await correrJob().expect(200)).body as IngestaRes;
    expect(job.proveedores).toEqual([
      expect.objectContaining({
        nombre: 'DolarApi',
        ok: false,
        error: 'DolarApi: respondió HTTP 503',
      }),
      expect.objectContaining({ ok: true }),
    ]);
    // Los valores del IPC pasan a la fuente de respaldo (mismos números).
    expect(job.actualizados).toBe(3);
    const r = await resumen();
    expect(valor(r, 'DOLAR_OFICIAL_VENTA')?.valor).toBe('1050');
    expect(valor(r, 'IPC_MENSUAL')?.fuente).toBe('ArgentinaDatos');
  });

  it('histórico por código; código inexistente → 404', async () => {
    const h = await request(t.server)
      .get('/api/v1/indicadores/IPC_MENSUAL/historico?desde=2099-01-01&hasta=2099-12-31')
      .expect(200);
    expect(h.body).toEqual({
      codigo: 'IPC_MENSUAL',
      puntos: [
        { fecha: '2099-01-01', valor: '2.2', fuente: 'ArgentinaDatos' },
        { fecha: '2099-02-01', valor: '2.4', fuente: 'ArgentinaDatos' },
        { fecha: '2099-03-01', valor: '3.7', fuente: 'ArgentinaDatos' },
      ],
    });
    await request(t.server).get('/api/v1/indicadores/DOLAR_BLUE/historico').expect(404);
  });

  it('admin: corrige un valor (auditado) y la ingesta no lo pisa; un usuario común no puede', async () => {
    const correccion = { codigo: 'DOLAR_MEP_VENTA', fecha: '2099-03-10', valor: '1190' };
    await request(t.server)
      .put('/api/v1/admin/indicadores')
      .set('Authorization', usuario.auth)
      .send(correccion)
      .expect(403);
    await request(t.server).put('/api/v1/admin/indicadores').send(correccion).expect(401);

    const res = await request(t.server)
      .put('/api/v1/admin/indicadores')
      .set('Authorization', admin.auth)
      .send(correccion)
      .expect(200);
    expect(res.body).toMatchObject({ ...correccion, fuente: 'Carga manual EFE' });

    const auditoria = await t.prisma.auditoria.findFirstOrThrow({
      where: { actorId: admin.id, accion: 'admin.corregir_indicador' },
    });
    expect(auditoria.datos).toMatchObject({
      codigo: 'DOLAR_MEP_VENTA',
      anterior: { valor: '1180.5', fuente: 'DolarApi (dolarhoy.com)' },
      nuevo: '1190',
    });

    // El cache se invalida con la corrección.
    expect(valor(await resumen(), 'DOLAR_MEP_VENTA')?.valor).toBe('1190');

    const job = (await correrJob().expect(200)).body as IngestaRes;
    expect(job.manualesConservados).toBe(1);
    expect(valor(await resumen(), 'DOLAR_MEP_VENTA')?.valor).toBe('1190');

    const lista = await request(t.server)
      .get('/api/v1/admin/indicadores?codigo=DOLAR_MEP_VENTA&desde=2099-01-01')
      .set('Authorization', admin.auth)
      .expect(200);
    expect(lista.body).toEqual([
      expect.objectContaining({ valor: '1190', fuente: 'Carga manual EFE' }),
    ]);
    await request(t.server)
      .get('/api/v1/admin/indicadores')
      .set('Authorization', usuario.auth)
      .expect(403);
  });

  it('variación contra el día anterior', async () => {
    respuestas['dolarapi.com'] = (
      fixture('dolarapi.json') as { fechaActualizacion: string; venta: number | null }[]
    ).map((c) => ({
      ...c,
      fechaActualizacion: '2099-03-11T18:00:00.000Z',
      venta: c.venta === null ? null : c.venta * 1.02,
    }));
    await correrJob().expect(200);
    const oficial = valor(await resumen(), 'DOLAR_OFICIAL_VENTA');
    expect(oficial).toMatchObject({
      fecha: '2099-03-11',
      valor: '1071',
      anterior: { fecha: '2099-03-10', valor: '1050' },
      variacion: '2.00',
    });
  });
});
