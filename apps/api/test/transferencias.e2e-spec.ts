import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  type UsuarioDePrueba,
} from './helpers';

interface TransferenciaRes {
  id: string;
  cuentaOrigen: { id: string; moneda: string };
  cuentaDestino: { id: string; moneda: string };
  montoOrigen: string;
  montoDestino: string;
  cotizacion: string | null;
  fecha: string;
  descripcion: string | null;
}

describe('Transferencias (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;
  let pesos: string;
  let pesos2: string;
  let dolares: string;

  const post = (u: UsuarioDePrueba, body: object) =>
    request(t.server).post('/api/v1/transferencias').set('Authorization', u.auth).send(body);
  const patch = (u: UsuarioDePrueba, id: string, body: object) =>
    request(t.server).patch(`/api/v1/transferencias/${id}`).set('Authorization', u.auth).send(body);
  const saldos = async () => {
    const res = await request(t.server)
      .get('/api/v1/cuentas')
      .set('Authorization', a.auth)
      .expect(200);
    return new Map(
      (res.body as { id: string; saldoActual: string }[]).map((c) => [c.id, c.saldoActual]),
    );
  };

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'tr-a');
    b = await crearUsuario(t.server, 'tr-b');
    const crear = async (nombre: string, moneda: string, saldoInicial: string) =>
      (
        await request(t.server)
          .post('/api/v1/cuentas')
          .set('Authorization', a.auth)
          .send({ nombre, moneda, saldoInicial })
          .expect(201)
      ).body.id as string;
    pesos = await crear('Pesos', 'ARS', '2000000');
    pesos2 = await crear('Billetera', 'ARS', '0');
    dolares = await crear('Dólares', 'USD', '0');
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('ARS → USD con los dos montos: devuelve la cotización implícita y mueve los saldos', async () => {
    const res = await post(a, {
      cuentaOrigenId: pesos,
      cuentaDestinoId: dolares,
      montoOrigen: '1250000',
      montoDestino: '1000',
      fecha: '2026-11-20',
      descripcion: 'Compra de dólares',
    }).expect(201);
    expect(res.body).toMatchObject({
      cuentaOrigen: { id: pesos, moneda: 'ARS' },
      cuentaDestino: { id: dolares, moneda: 'USD' },
      montoOrigen: '1250000.00',
      montoDestino: '1000.00',
      cotizacion: '1250.00',
      fecha: '2026-11-20',
    });
    const s = await saldos();
    expect(s.get(pesos)).toBe('750000.00');
    expect(s.get(dolares)).toBe('1000.00');
  });

  it('entre monedas distintas el monto de destino es obligatorio (422)', async () => {
    const res = await post(a, {
      cuentaOrigenId: dolares,
      cuentaDestinoId: pesos,
      montoOrigen: '100',
      fecha: '2026-11-21',
    }).expect(422);
    expect(res.body.error.code).toBe('MONTO_DESTINO_REQUERIDO');
  });

  it('misma moneda: sin montoDestino llega lo mismo; distinto → 422', async () => {
    const ok = await post(a, {
      cuentaOrigenId: pesos,
      cuentaDestinoId: pesos2,
      montoOrigen: '5000',
      fecha: '2026-11-22',
    }).expect(201);
    expect(ok.body).toMatchObject({
      montoOrigen: '5000.00',
      montoDestino: '5000.00',
      cotizacion: null,
    });

    // "5000.00" y "5000" son el mismo monto.
    await post(a, {
      cuentaOrigenId: pesos,
      cuentaDestinoId: pesos2,
      montoOrigen: '5000',
      montoDestino: '5000.00',
      fecha: '2026-11-22',
    }).expect(201);

    const mal = await post(a, {
      cuentaOrigenId: pesos,
      cuentaDestinoId: pesos2,
      montoOrigen: '5000',
      montoDestino: '4999',
      fecha: '2026-11-22',
    }).expect(422);
    expect(mal.body.error.code).toBe('MONTO_DESTINO_INVALIDO');
  });

  it('origen y destino iguales → 400; cuenta de otro usuario → 404', async () => {
    await post(a, {
      cuentaOrigenId: pesos,
      cuentaDestinoId: pesos,
      montoOrigen: '1',
      fecha: '2026-11-22',
    }).expect(400);
    const cuentaB = await t.prisma.cuenta.create({ data: { usuarioId: b.id, nombre: 'De B' } });
    await post(a, {
      cuentaOrigenId: pesos,
      cuentaDestinoId: cuentaB.id,
      montoOrigen: '1',
      fecha: '2026-11-22',
    }).expect(404);
    await post(b, {
      cuentaOrigenId: cuentaB.id,
      cuentaDestinoId: pesos,
      montoOrigen: '1',
      fecha: '2026-11-22',
    }).expect(404);
  });

  it('PATCH revalida: cambiar a otra moneda exige montoDestino; conserva la cotización si ya era entre monedas', async () => {
    const tr = (
      await post(a, {
        cuentaOrigenId: pesos,
        cuentaDestinoId: pesos2,
        montoOrigen: '1000',
        fecha: '2026-11-23',
      }).expect(201)
    ).body as TransferenciaRes;

    const sinMonto = await patch(a, tr.id, { cuentaDestinoId: dolares }).expect(422);
    expect(sinMonto.body.error.code).toBe('MONTO_DESTINO_REQUERIDO');

    const conMonto = await patch(a, tr.id, {
      cuentaDestinoId: dolares,
      montoDestino: '0.8',
    }).expect(200);
    expect(conMonto.body).toMatchObject({ montoDestino: '0.80', cotizacion: '1250.00' });

    // Cambiar solo la fecha deja los montos como estaban.
    const fecha = await patch(a, tr.id, { fecha: '2026-11-24' }).expect(200);
    expect(fecha.body).toMatchObject({
      fecha: '2026-11-24',
      montoOrigen: '1000.00',
      montoDestino: '0.80',
    });

    // Volver a misma moneda: el destino pasa a ser igual al origen.
    const vuelta = await patch(a, tr.id, { cuentaDestinoId: pesos2 }).expect(200);
    expect(vuelta.body).toMatchObject({ montoDestino: '1000.00', cotizacion: null });

    expect((await patch(a, tr.id, { cuentaDestinoId: pesos }).expect(422)).body.error.code).toBe(
      'CUENTAS_IGUALES',
    );
  });

  it('lista paginada, filtra por cuenta (origen o destino); aislamiento y borrado', async () => {
    const todas = await request(t.server)
      .get('/api/v1/transferencias?limit=2')
      .set('Authorization', a.auth)
      .expect(200);
    expect(todas.body.items).toHaveLength(2);
    expect(todas.body.nextCursor).toEqual(expect.any(String));

    const conDolares = await request(t.server)
      .get(`/api/v1/transferencias?cuentaId=${dolares}&limit=100`)
      .set('Authorization', a.auth)
      .expect(200);
    expect(
      (conDolares.body.items as TransferenciaRes[]).every(
        (x) => x.cuentaOrigen.id === dolares || x.cuentaDestino.id === dolares,
      ),
    ).toBe(true);

    const deB = await request(t.server)
      .get('/api/v1/transferencias')
      .set('Authorization', b.auth)
      .expect(200);
    expect(deB.body.items).toHaveLength(0);

    const una = (todas.body.items as TransferenciaRes[])[0]!;
    await patch(b, una.id, { descripcion: 'x' }).expect(404);
    await request(t.server)
      .delete(`/api/v1/transferencias/${una.id}`)
      .set('Authorization', b.auth)
      .expect(404);
    await request(t.server)
      .delete(`/api/v1/transferencias/${una.id}`)
      .set('Authorization', a.auth)
      .expect(204);
    expect(await t.prisma.transferencia.findUnique({ where: { id: una.id } })).toBeNull();
  });
});
