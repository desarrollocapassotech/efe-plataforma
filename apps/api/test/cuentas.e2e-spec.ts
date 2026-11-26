import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  fecha,
  type UsuarioDePrueba,
} from './helpers';

interface CuentaRes {
  id: string;
  nombre: string;
  tipo: string;
  moneda: string;
  color: string | null;
  saldoInicial: string;
  saldoActual: string;
  archivada: boolean;
  orden: number;
}

describe('Cuentas (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;

  const post = (u: UsuarioDePrueba, body: object) =>
    request(t.server).post('/api/v1/cuentas').set('Authorization', u.auth).send(body);
  const listar = async (u: UsuarioDePrueba, query = '') =>
    (
      await request(t.server)
        .get(`/api/v1/cuentas${query}`)
        .set('Authorization', u.auth)
        .expect(200)
    ).body as CuentaRes[];

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'cuentas-a');
    b = await crearUsuario(t.server, 'cuentas-b');
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('crea con defaults, saldos en string con 2 decimales y orden correlativo', async () => {
    const r1 = await post(a, { nombre: '  Efectivo ' }).expect(201);
    expect(r1.body).toMatchObject({
      nombre: 'Efectivo',
      tipo: 'OTRA',
      moneda: 'ARS',
      color: null,
      saldoInicial: '0.00',
      saldoActual: '0.00',
      archivada: false,
      orden: 0,
    });
    const r2 = await post(a, {
      nombre: 'Banco',
      tipo: 'BANCO',
      moneda: 'USD',
      color: '#2e4a8b',
      saldoInicial: '1500.5',
    }).expect(201);
    expect(r2.body).toMatchObject({
      color: '#2E4A8B',
      saldoInicial: '1500.50',
      saldoActual: '1500.50',
      orden: 1,
    });
  });

  it('valida el body', async () => {
    for (const body of [
      { nombre: '' },
      { nombre: 'x', moneda: 'EUR' },
      { nombre: 'x', saldoInicial: 100 },
      { nombre: 'x', saldoInicial: '1.234' },
      { nombre: 'x', tipo: 'CRIPTO' },
      { nombre: 'x', usuarioId: b.id },
    ]) {
      const res = await post(a, body).expect(400);
      expect(res.body.error.code).toBe('VALIDACION');
    }
  });

  it('cada usuario ve solo sus cuentas; las de otro dan 404', async () => {
    const deA = (await post(a, { nombre: 'Secreta de A' }).expect(201)).body as CuentaRes;
    await post(b, { nombre: 'Cuenta de B' }).expect(201);

    const listaB = await listar(b);
    expect(listaB.map((c) => c.nombre)).toEqual(['Cuenta de B']);
    expect((await listar(a)).some((c) => c.nombre === 'Cuenta de B')).toBe(false);

    const patch = await request(t.server)
      .patch(`/api/v1/cuentas/${deA.id}`)
      .set('Authorization', b.auth)
      .send({ nombre: 'hackeada' })
      .expect(404);
    expect(patch.body.error.code).toBe('NO_ENCONTRADO');
    await request(t.server)
      .delete(`/api/v1/cuentas/${deA.id}`)
      .set('Authorization', b.auth)
      .expect(404);
    await request(t.server)
      .patch('/api/v1/cuentas/no-existe')
      .set('Authorization', a.auth)
      .send({ nombre: 'x' })
      .expect(404);

    const intacta = await t.prisma.cuenta.findUniqueOrThrow({ where: { id: deA.id } });
    expect(intacta.nombre).toBe('Secreta de A');
  });

  it('archivar la saca del listado salvo con ?incluirArchivadas=true', async () => {
    const c = (await post(a, { nombre: 'Para archivar' }).expect(201)).body as CuentaRes;
    const res = await request(t.server)
      .patch(`/api/v1/cuentas/${c.id}`)
      .set('Authorization', a.auth)
      .send({ archivada: true })
      .expect(200);
    expect(res.body.archivada).toBe(true);
    expect((await listar(a)).some((x) => x.id === c.id)).toBe(false);
    expect((await listar(a, '?incluirArchivadas=true')).some((x) => x.id === c.id)).toBe(true);
    expect((await listar(a, '?incluirArchivadas=false')).some((x) => x.id === c.id)).toBe(false);
  });

  it('saldo actual con todos los tipos de operación (agregado en SQL)', async () => {
    const pesos = (await post(a, { nombre: 'Pesos', saldoInicial: '1000.50' }).expect(201))
      .body as CuentaRes;
    const otra = (await post(a, { nombre: 'Otra en pesos' }).expect(201)).body as CuentaRes;
    const dolares = (
      await post(a, { nombre: 'Dólares', moneda: 'USD', saldoInicial: '100' }).expect(201)
    ).body as CuentaRes;

    const base = { usuarioId: a.id, fecha: fecha('2026-11-10') };
    await t.prisma.movimiento.createMany({
      data: [
        { ...base, cuentaId: pesos.id, tipo: 'INGRESO', monto: '500', moneda: 'ARS' },
        { ...base, cuentaId: pesos.id, tipo: 'GASTO', monto: '200.25', moneda: 'ARS' },
      ],
    });
    await t.prisma.transferencia.createMany({
      data: [
        // Compra de dólares: sale 1000 ARS, entra 1 USD.
        {
          ...base,
          cuentaOrigenId: pesos.id,
          cuentaDestinoId: dolares.id,
          montoOrigen: '1000',
          montoDestino: '1',
        },
        // Entra plata de otra cuenta en pesos.
        {
          ...base,
          cuentaOrigenId: otra.id,
          cuentaDestinoId: pesos.id,
          montoOrigen: '300',
          montoDestino: '300',
        },
      ],
    });
    const tarjeta = await t.prisma.tarjeta.create({
      data: { usuarioId: a.id, nombre: 'Visa', diaCierre: 25, diaVencimiento: 5 },
    });
    await t.prisma.pagoResumen.create({
      data: {
        ...base,
        tarjetaId: tarjeta.id,
        cuentaId: pesos.id,
        periodo: '2026-11',
        monto: '150',
        moneda: 'ARS',
      },
    });
    // Una compra en cuotas NO afecta el saldo de ninguna cuenta (solo el pago del resumen).
    await t.prisma.compraTarjeta.create({
      data: {
        usuarioId: a.id,
        tarjetaId: tarjeta.id,
        descripcion: 'Heladera',
        fecha: fecha('2026-11-02'),
        montoTotal: '900',
        moneda: 'ARS',
        cantidadCuotas: 3,
        cuotas: {
          create: ['2026-12', '2027-01', '2027-02'].map((periodoResumen, i) => ({
            numero: i + 1,
            monto: '300',
            moneda: 'ARS' as const,
            periodoResumen,
            usuarioId: a.id,
            tarjetaId: tarjeta.id,
          })),
        },
      },
    });
    // Operaciones de otro usuario no cuentan.
    const deB = (await post(b, { nombre: 'B pesos' }).expect(201)).body as CuentaRes;
    await t.prisma.movimiento.create({
      data: {
        usuarioId: b.id,
        cuentaId: deB.id,
        tipo: 'INGRESO',
        monto: '99999',
        moneda: 'ARS',
        fecha: fecha('2026-11-10'),
      },
    });

    const saldos = new Map((await listar(a)).map((c) => [c.id, c.saldoActual]));
    // 1000.50 + 500 − 200.25 − 1000 + 300 − 150
    expect(saldos.get(pesos.id)).toBe('450.25');
    expect(saldos.get(otra.id)).toBe('-300.00');
    expect(saldos.get(dolares.id)).toBe('101.00');

    // PATCH también devuelve el saldo calculado.
    const patch = await request(t.server)
      .patch(`/api/v1/cuentas/${pesos.id}`)
      .set('Authorization', a.auth)
      .send({ saldoInicial: '0' })
      .expect(200);
    expect(patch.body.saldoActual).toBe('-550.25');
  });

  it('no deja borrar una cuenta con operaciones (409) ni cambiarle la moneda', async () => {
    const c = (await post(a, { nombre: 'Con movimientos' }).expect(201)).body as CuentaRes;
    await t.prisma.movimiento.create({
      data: {
        usuarioId: a.id,
        cuentaId: c.id,
        tipo: 'GASTO',
        monto: '10',
        moneda: 'ARS',
        fecha: fecha('2026-11-01'),
      },
    });

    const del = await request(t.server)
      .delete(`/api/v1/cuentas/${c.id}`)
      .set('Authorization', a.auth)
      .expect(409);
    expect(del.body.error.code).toBe('CUENTA_CON_MOVIMIENTOS');

    const moneda = await request(t.server)
      .patch(`/api/v1/cuentas/${c.id}`)
      .set('Authorization', a.auth)
      .send({ moneda: 'USD' })
      .expect(409);
    expect(moneda.body.error.code).toBe('CUENTA_MONEDA_BLOQUEADA');

    // Mandar la misma moneda no es un cambio.
    await request(t.server)
      .patch(`/api/v1/cuentas/${c.id}`)
      .set('Authorization', a.auth)
      .send({ moneda: 'ARS' })
      .expect(200);
  });

  it('una cuenta sin operaciones se puede cambiar de moneda y borrar', async () => {
    const c = (await post(a, { nombre: 'Vacía' }).expect(201)).body as CuentaRes;
    const res = await request(t.server)
      .patch(`/api/v1/cuentas/${c.id}`)
      .set('Authorization', a.auth)
      .send({ moneda: 'USD' })
      .expect(200);
    expect(res.body.moneda).toBe('USD');
    await request(t.server)
      .delete(`/api/v1/cuentas/${c.id}`)
      .set('Authorization', a.auth)
      .expect(204);
    expect((await listar(a, '?incluirArchivadas=true')).some((x) => x.id === c.id)).toBe(false);
  });
});
