import { hoy, periodoDe, sumarPeriodos } from '@efe/shared/fechas';
import { proximoResumen } from '@efe/shared/tarjetas';
import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  type UsuarioDePrueba,
} from './helpers';

interface Saldo {
  moneda: string;
  total: string;
  pagado: string;
  pendiente: string;
}
interface ResumenRes {
  periodo: string;
  fechaCierre: string;
  fechaVencimiento: string;
  fechasManuales: boolean;
  cuotas: { compraId: string; numero: number; cantidadCuotas: number; monto: string }[];
  saldos: Saldo[];
  pagos: { id: string; monto: string }[];
}
interface CompraRes {
  id: string;
  cantidadCuotas: number;
  cuotas: { numero: number; monto: string; periodoResumen: string }[];
}

describe('Tarjetas, compras y pagos (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;
  let tarjeta: string;
  let cuentaPesos: string;
  let cuentaDolares: string;
  let categoriaGasto: string;
  let categoriaIngreso: string;

  // Compras con fecha futura para que "el próximo resumen a pagar" (desde donde se
  // recalcula al cambiar el cierre) sea siempre anterior a sus cuotas.
  const periodoHoy = periodoDe(hoy());
  const base = sumarPeriodos(periodoHoy, 2);
  const p = (n: number) => sumarPeriodos(base, n);
  const fechaCompra = `${base}-10`;

  const api = (u: UsuarioDePrueba) => ({
    get: (ruta: string) => request(t.server).get(`/api/v1${ruta}`).set('Authorization', u.auth),
    post: (ruta: string, body: object) =>
      request(t.server).post(`/api/v1${ruta}`).set('Authorization', u.auth).send(body),
    patch: (ruta: string, body: object) =>
      request(t.server).patch(`/api/v1${ruta}`).set('Authorization', u.auth).send(body),
    put: (ruta: string, body: object) =>
      request(t.server).put(`/api/v1${ruta}`).set('Authorization', u.auth).send(body),
    delete: (ruta: string) =>
      request(t.server).delete(`/api/v1${ruta}`).set('Authorization', u.auth),
  });

  const resumen = async (u: UsuarioDePrueba, periodo?: string, tarjetaId = tarjeta) => {
    const q = periodo ? `&periodo=${periodo}` : '';
    const res = await api(u).get(`/tarjetas/resumen?tarjetaId=${tarjetaId}${q}`).expect(200);
    return (res.body as ResumenRes[])[0]!;
  };
  const periodosDe = async (compraId: string) => {
    const filas = await t.prisma.cuota.findMany({
      where: { compraId },
      orderBy: { numero: 'asc' },
    });
    return filas.map((c) => c.periodoResumen);
  };

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'tarjetas-a');
    b = await crearUsuario(t.server, 'tarjetas-b');

    const pesos = await api(a)
      .post('/cuentas', { nombre: 'Banco', moneda: 'ARS', saldoInicial: '1000' })
      .expect(201);
    cuentaPesos = (pesos.body as { id: string }).id;
    const dolares = await api(a)
      .post('/cuentas', { nombre: 'Dólares', moneda: 'USD', saldoInicial: '500' })
      .expect(201);
    cuentaDolares = (dolares.body as { id: string }).id;

    const categorias = await t.prisma.categoria.findMany({ where: { usuarioId: a.id } });
    categoriaGasto = categorias.find((c) => c.tipo === 'GASTO')!.id;
    categoriaIngreso = categorias.find((c) => c.tipo === 'INGRESO')!.id;
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('crea una tarjeta, valida los datos y devuelve el próximo resumen', async () => {
    await api(a)
      .post('/tarjetas', { nombre: 'Visa', diaCierre: 32, diaVencimiento: 5 })
      .expect(400);
    await api(a)
      .post('/tarjetas', { nombre: 'Visa', diaCierre: 25, diaVencimiento: 5, ultimos4: '12' })
      .expect(400);
    await api(a)
      .post('/tarjetas', { nombre: 'Visa', diaCierre: 25, diaVencimiento: 5, usuarioId: b.id })
      .expect(400);

    const res = await api(a)
      .post('/tarjetas', {
        nombre: 'Visa Galicia',
        red: 'VISA',
        ultimos4: '4321',
        diaCierre: 25,
        diaVencimiento: 5,
        color: '#1e2e51',
      })
      .expect(201);
    tarjeta = (res.body as { id: string }).id;
    const esperado = proximoResumen(hoy(), { diaCierre: 25, diaVencimiento: 5 });
    expect(res.body).toMatchObject({
      nombre: 'Visa Galicia',
      red: 'VISA',
      ultimos4: '4321',
      color: '#1E2E51',
      archivada: false,
      proximoResumen: { ...esperado, saldos: [] },
    });

    const lista = await api(a).get('/tarjetas').expect(200);
    expect((lista.body as { id: string }[]).map((x) => x.id)).toEqual([tarjeta]);
  });

  it('una compra en 3 cuotas aparece en 3 resúmenes consecutivos', async () => {
    await api(a)
      .post('/tarjetas/compras', {
        tarjetaId: tarjeta,
        categoriaId: categoriaIngreso,
        descripcion: 'X',
        fecha: fechaCompra,
        montoTotal: '100',
      })
      .expect(422)
      .expect((r) =>
        expect((r.body as { error: { code: string } }).error.code).toBe('CATEGORIA_TIPO_INVALIDO'),
      );

    const res = await api(a)
      .post('/tarjetas/compras', {
        tarjetaId: tarjeta,
        categoriaId: categoriaGasto,
        descripcion: 'Zapatillas',
        fecha: fechaCompra,
        montoTotal: '100',
        cantidadCuotas: 3,
      })
      .expect(201);
    const compra = res.body as CompraRes;
    expect(compra.cuotas).toEqual([
      { numero: 1, monto: '33.33', periodoResumen: p(1) },
      { numero: 2, monto: '33.33', periodoResumen: p(2) },
      { numero: 3, monto: '33.34', periodoResumen: p(3) },
    ]);

    for (const [i, periodo] of [p(1), p(2), p(3)].entries()) {
      const r = await resumen(a, periodo);
      expect(r.cuotas).toEqual([
        expect.objectContaining({
          compraId: compra.id,
          numero: i + 1,
          cantidadCuotas: 3,
          montoTotal: '100.00',
        }),
      ]);
      expect(r.saldos).toEqual([
        {
          moneda: 'ARS',
          total: i === 2 ? '33.34' : '33.33',
          pagado: '0.00',
          pendiente: i === 2 ? '33.34' : '33.33',
        },
      ]);
    }
    const primero = await resumen(a, p(1));
    expect(primero).toMatchObject({
      fechaCierre: `${base}-25`,
      fechaVencimiento: `${p(1)}-05`,
      fechasManuales: false,
    });
  });

  it('cambiar el día de cierre mueve las cuotas', async () => {
    const compra = await t.prisma.compraTarjeta.findFirstOrThrow({
      where: { tarjetaId: tarjeta, descripcion: 'Zapatillas' },
    });
    // Cierre el 5: la compra del 10 entra en el cierre del mes siguiente, que vence 2 meses después.
    await api(a).patch(`/tarjetas/${tarjeta}`, { diaCierre: 5 }).expect(200);
    expect(await periodosDe(compra.id)).toEqual([p(2), p(3), p(4)]);

    await api(a).patch(`/tarjetas/${tarjeta}`, { diaCierre: 25 }).expect(200);
    expect(await periodosDe(compra.id)).toEqual([p(1), p(2), p(3)]);
  });

  it('un override de fechas mueve las cuotas y al borrarlo vuelven', async () => {
    const compra = await t.prisma.compraTarjeta.findFirstOrThrow({
      where: { tarjetaId: tarjeta, descripcion: 'Zapatillas' },
    });
    await api(a).put(`/tarjetas/${tarjeta}/cierres/no-es-periodo`, {}).expect(400);
    await api(a)
      .put(`/tarjetas/${tarjeta}/cierres/${p(1)}`, {
        fechaCierre: `${base}-08`,
        fechaVencimiento: `${p(2)}-01`,
      })
      .expect(422)
      .expect((r) =>
        expect((r.body as { error: { code: string } }).error.code).toBe('CIERRE_INVALIDO'),
      );

    // El banco adelantó el cierre al 8: la compra del 10 pasa al resumen siguiente.
    await api(a)
      .put(`/tarjetas/${tarjeta}/cierres/${p(1)}`, {
        fechaCierre: `${base}-08`,
        fechaVencimiento: `${p(1)}-01`,
      })
      .expect(200);
    expect(await periodosDe(compra.id)).toEqual([p(2), p(3), p(4)]);
    const conOverride = await resumen(a, p(1));
    expect(conOverride).toMatchObject({
      fechaCierre: `${base}-08`,
      fechaVencimiento: `${p(1)}-01`,
      fechasManuales: true,
      cuotas: [],
    });

    await api(a)
      .delete(`/tarjetas/${tarjeta}/cierres/${p(1)}`)
      .expect(204);
    expect(await periodosDe(compra.id)).toEqual([p(1), p(2), p(3)]);
  });

  it('editar una compra regenera sus cuotas; se listan paginadas', async () => {
    const res = await api(a)
      .post('/tarjetas/compras', {
        tarjetaId: tarjeta,
        descripcion: 'Curso',
        fecha: fechaCompra,
        montoTotal: '50',
        moneda: 'USD',
      })
      .expect(201);
    const compra = res.body as CompraRes;
    expect(compra.cuotas).toEqual([{ numero: 1, monto: '50.00', periodoResumen: p(1) }]);

    const editada = await api(a)
      .patch(`/tarjetas/compras/${compra.id}`, { cantidadCuotas: 2 })
      .expect(200);
    expect((editada.body as CompraRes).cuotas).toEqual([
      { numero: 1, monto: '25.00', periodoResumen: p(1) },
      { numero: 2, monto: '25.00', periodoResumen: p(2) },
    ]);

    const pagina1 = await api(a).get(`/tarjetas/compras?tarjetaId=${tarjeta}&limit=1`).expect(200);
    const body1 = pagina1.body as { items: CompraRes[]; nextCursor: string | null };
    expect(body1.items).toHaveLength(1);
    expect(body1.nextCursor).not.toBeNull();
    const pagina2 = await api(a)
      .get(`/tarjetas/compras?tarjetaId=${tarjeta}&limit=1&cursor=${body1.nextCursor}`)
      .expect(200);
    const body2 = pagina2.body as { items: CompraRes[]; nextCursor: string | null };
    expect(body2.items).toHaveLength(1);
    expect(body2.items[0]!.id).not.toBe(body1.items[0]!.id);
    expect(body2.nextCursor).toBeNull();
  });

  it('pagos: descuentan del saldo de la cuenta pero no son gasto; validan la moneda', async () => {
    await api(a)
      .post('/tarjetas/pagos', {
        tarjetaId: tarjeta,
        cuentaId: cuentaDolares,
        periodo: p(1),
        monto: '20',
        moneda: 'ARS',
        fecha: `${p(1)}-03`,
      })
      .expect(422)
      .expect((r) =>
        expect((r.body as { error: { code: string } }).error.code).toBe('CUENTA_MONEDA_DISTINTA'),
      );

    const pago = await api(a)
      .post('/tarjetas/pagos', {
        tarjetaId: tarjeta,
        cuentaId: cuentaPesos,
        periodo: p(1),
        monto: '20',
        moneda: 'ARS',
        fecha: `${p(1)}-03`,
      })
      .expect(201);
    expect(pago.body).toMatchObject({ monto: '20.00', moneda: 'ARS', periodo: p(1) });

    const r = await resumen(a, p(1));
    expect(r.saldos).toEqual([
      { moneda: 'ARS', total: '33.33', pagado: '20.00', pendiente: '13.33' },
      { moneda: 'USD', total: '25.00', pagado: '0.00', pendiente: '25.00' },
    ]);
    expect(r.pagos).toHaveLength(1);

    const cuentas = await api(a).get('/cuentas').expect(200);
    const banco = (cuentas.body as { id: string; saldoActual: string }[]).find(
      (c) => c.id === cuentaPesos,
    );
    expect(banco?.saldoActual).toBe('980.00');

    const mensual = await api(a)
      .get(`/resumen/mensual?periodo=${p(1)}`)
      .expect(200);
    const ars = (
      mensual.body as { monedas: { moneda: string; gastos: string; gastosTarjeta: string }[] }
    ).monedas.find((m) => m.moneda === 'ARS');
    expect(ars).toMatchObject({ gastos: '33.33', gastosTarjeta: '33.33' });

    const pagos = await api(a)
      .get(`/tarjetas/pagos?periodo=${p(1)}`)
      .expect(200);
    expect(pagos.body).toHaveLength(1);
    await api(a)
      .delete(`/tarjetas/pagos/${(pago.body as { id: string }).id}`)
      .expect(204);
    expect((await resumen(a, p(1))).saldos[0]).toMatchObject({
      pagado: '0.00',
      pendiente: '33.33',
    });
  });

  it('sin período devuelve el próximo a vencer', async () => {
    const r = await resumen(a);
    expect(r.periodo).toBe(proximoResumen(hoy(), { diaCierre: 25, diaVencimiento: 5 }).periodo);
  });

  it('compromisos: total por período, moneda y tarjeta', async () => {
    const res = await api(a).get('/tarjetas/compromisos?meses=6').expect(200);
    const body = res.body as {
      desde: string;
      hasta: string;
      periodos: {
        periodo: string;
        totales: { moneda: string; total: string }[];
        porTarjeta: { tarjeta: { id: string }; moneda: string; total: string }[];
      }[];
    };
    expect(body.desde).toBe(periodoHoy);
    expect(body.hasta).toBe(sumarPeriodos(periodoHoy, 5));
    expect(body.periodos).toHaveLength(6);
    const enP1 = body.periodos.find((x) => x.periodo === p(1))!;
    expect(enP1.totales).toEqual([
      { moneda: 'ARS', total: '33.33' },
      { moneda: 'USD', total: '25.00' },
    ]);
    expect(enP1.porTarjeta).toEqual([
      expect.objectContaining({
        tarjeta: expect.objectContaining({ id: tarjeta }),
        moneda: 'ARS',
        total: '33.33',
      }),
      expect.objectContaining({ moneda: 'USD', total: '25.00' }),
    ]);
    expect(body.periodos[0]!.totales).toEqual([]);
  });

  it('una tarjeta con compras no se borra: se archiva', async () => {
    await api(a)
      .delete(`/tarjetas/${tarjeta}`)
      .expect(409)
      .expect((r) =>
        expect((r.body as { error: { code: string } }).error.code).toBe('TARJETA_CON_COMPRAS'),
      );
    await api(a).patch(`/tarjetas/${tarjeta}`, { archivada: true }).expect(200);
    await api(a)
      .post('/tarjetas/compras', {
        tarjetaId: tarjeta,
        descripcion: 'X',
        fecha: fechaCompra,
        montoTotal: '10',
      })
      .expect(422);
    expect((await api(a).get('/tarjetas').expect(200)).body).toEqual([]);
    expect((await api(a).get('/tarjetas?incluirArchivadas=true').expect(200)).body).toHaveLength(1);
    await api(a).patch(`/tarjetas/${tarjeta}`, { archivada: false }).expect(200);

    const vacia = await api(a)
      .post('/tarjetas', { nombre: 'Sin uso', diaCierre: 1, diaVencimiento: 10 })
      .expect(201);
    await api(a)
      .delete(`/tarjetas/${(vacia.body as { id: string }).id}`)
      .expect(204);
  });

  it('aislamiento: otro usuario no ve ni toca tarjetas, compras ni pagos ajenos', async () => {
    const compra = await t.prisma.compraTarjeta.findFirstOrThrow({ where: { tarjetaId: tarjeta } });

    expect((await api(b).get('/tarjetas').expect(200)).body).toEqual([]);
    expect((await api(b).get('/tarjetas/resumen').expect(200)).body).toEqual([]);
    expect((await api(b).get('/tarjetas/compras').expect(200)).body).toEqual({
      items: [],
      nextCursor: null,
    });
    expect((await api(b).get('/tarjetas/pagos').expect(200)).body).toEqual([]);
    const compromisos = await api(b).get('/tarjetas/compromisos?meses=6').expect(200);
    expect(
      (compromisos.body as { periodos: { totales: unknown[] }[] }).periodos.every(
        (x) => x.totales.length === 0,
      ),
    ).toBe(true);

    await api(b).get(`/tarjetas/resumen?tarjetaId=${tarjeta}`).expect(404);
    await api(b).patch(`/tarjetas/${tarjeta}`, { nombre: 'Mía' }).expect(404);
    await api(b).delete(`/tarjetas/${tarjeta}`).expect(404);
    await api(b)
      .put(`/tarjetas/${tarjeta}/cierres/${p(1)}`, {
        fechaCierre: `${base}-20`,
        fechaVencimiento: `${p(1)}-02`,
      })
      .expect(404);
    await api(b)
      .post('/tarjetas/compras', {
        tarjetaId: tarjeta,
        descripcion: 'X',
        fecha: fechaCompra,
        montoTotal: '10',
      })
      .expect(404);
    await api(b).patch(`/tarjetas/compras/${compra.id}`, { descripcion: 'Mía' }).expect(404);
    await api(b).delete(`/tarjetas/compras/${compra.id}`).expect(404);

    const propia = await api(b)
      .post('/tarjetas', { nombre: 'Master', diaCierre: 20, diaVencimiento: 1 })
      .expect(201);
    await api(b)
      .post('/tarjetas/pagos', {
        tarjetaId: (propia.body as { id: string }).id,
        cuentaId: cuentaPesos,
        periodo: p(1),
        monto: '1',
        moneda: 'ARS',
        fecha: `${p(1)}-01`,
      })
      .expect(404);

    // Lo de A quedó intacto.
    const intacta = await t.prisma.tarjeta.findUniqueOrThrow({ where: { id: tarjeta } });
    expect(intacta.nombre).toBe('Visa Galicia');
  });
});
