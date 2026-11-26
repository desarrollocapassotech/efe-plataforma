import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  fecha,
  type UsuarioDePrueba,
} from './helpers';

/**
 * Set de datos armado a mano (usuario A), resultados calculados a mano:
 *
 * NOVIEMBRE 2026, ARS
 *   Ingresos: 1000 (Sueldo) + 500.50 (sin categoría)                    = 1500.50
 *   Gastos en movimientos: 300 (Alimentación) + 200 (Vivienda)
 *                          + 50.25 (sin categoría, el 30/11)           =  550.25
 *   Cuotas con período 2026-11: 100 (compra Alimentación) + 49.75 (compra Ropa) = 149.75
 *   Gastos = 700.00 · Saldo = 800.50 · % gastado = 700 / 1500.50 = 46.65
 *   Por categoría: Alimentación 400 (57.14), Vivienda 200 (28.57),
 *                  Sin categoría 50.25 (7.18), Ropa 49.75 (7.11)
 * NOVIEMBRE 2026, USD: ingreso 100, gasto 40 → saldo 60, 40.00 %
 * OCTUBRE 2026, ARS: ingreso 1000 (el 31/10), gasto 400 + cuota 100 (período 2026-10) → gastos 500
 *   Variación: ingresos (1500.50 − 1000) / 1000 = 50.05 %, gastos (700 − 500) / 500 = 40.00 %
 *
 * NO deben contar: transferencias, pagos de resumen, el movimiento del 01/12, la cuota
 * con período 2026-12, y los datos del usuario B.
 */
describe('Resumen (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'res-a');
    b = await crearUsuario(t.server, 'res-b');

    const cats = new Map(
      (await t.prisma.categoria.findMany({ where: { usuarioId: a.id } })).map((c) => [
        c.nombre,
        c.id,
      ]),
    );
    const [pesos, dolares] = await Promise.all([
      t.prisma.cuenta.create({ data: { usuarioId: a.id, nombre: 'Pesos', moneda: 'ARS' } }),
      t.prisma.cuenta.create({ data: { usuarioId: a.id, nombre: 'Dólares', moneda: 'USD' } }),
    ]);
    const mov = (
      cuenta: { id: string; moneda: 'ARS' | 'USD' },
      tipo: 'INGRESO' | 'GASTO',
      monto: string,
      dia: string,
      categoria?: string,
    ) => ({
      usuarioId: a.id,
      cuentaId: cuenta.id,
      categoriaId: categoria ? cats.get(categoria)! : null,
      tipo,
      monto,
      moneda: cuenta.moneda,
      fecha: fecha(dia),
    });
    await t.prisma.movimiento.createMany({
      data: [
        // Noviembre ARS
        mov(pesos, 'INGRESO', '1000', '2026-11-05', 'Sueldo'),
        mov(pesos, 'INGRESO', '500.50', '2026-11-12'),
        mov(pesos, 'GASTO', '300', '2026-11-01', 'Alimentación'),
        mov(pesos, 'GASTO', '200', '2026-11-10', 'Vivienda'),
        mov(pesos, 'GASTO', '50.25', '2026-11-30'),
        // Noviembre USD
        mov(dolares, 'INGRESO', '100', '2026-11-03'),
        mov(dolares, 'GASTO', '40', '2026-11-20', 'Salidas'),
        // Octubre ARS
        mov(pesos, 'INGRESO', '1000', '2026-10-31', 'Sueldo'),
        mov(pesos, 'GASTO', '400', '2026-10-15', 'Vivienda'),
        // Diciembre: no cuenta para noviembre
        mov(pesos, 'GASTO', '9999', '2026-12-01', 'Alimentación'),
      ],
    });

    const tarjeta = await t.prisma.tarjeta.create({
      data: { usuarioId: a.id, nombre: 'Visa', diaCierre: 25, diaVencimiento: 5 },
    });
    const compra = (descripcion: string, categoria: string, cuotas: [string, string][]) =>
      t.prisma.compraTarjeta.create({
        data: {
          usuarioId: a.id,
          tarjetaId: tarjeta.id,
          categoriaId: cats.get(categoria)!,
          descripcion,
          fecha: fecha('2026-09-20'),
          montoTotal: '1',
          moneda: 'ARS',
          cantidadCuotas: cuotas.length,
          cuotas: {
            create: cuotas.map(([periodoResumen, monto], i) => ({
              numero: i + 1,
              monto,
              moneda: 'ARS' as const,
              periodoResumen,
              usuarioId: a.id,
              tarjetaId: tarjeta.id,
            })),
          },
        },
      });
    await compra('Supermercado en cuotas', 'Alimentación', [
      ['2026-10', '100'],
      ['2026-11', '100'],
    ]);
    await compra('Zapatillas', 'Ropa', [
      ['2026-11', '49.75'],
      ['2026-12', '49.75'],
    ]);

    // No son ingreso ni gasto.
    await t.prisma.transferencia.create({
      data: {
        usuarioId: a.id,
        cuentaOrigenId: pesos.id,
        cuentaDestinoId: dolares.id,
        montoOrigen: '125000',
        montoDestino: '100',
        fecha: fecha('2026-11-15'),
      },
    });
    await t.prisma.pagoResumen.create({
      data: {
        usuarioId: a.id,
        tarjetaId: tarjeta.id,
        cuentaId: pesos.id,
        periodo: '2026-11',
        monto: '149.75',
        moneda: 'ARS',
        fecha: fecha('2026-11-05'),
      },
    });

    // Datos de otro usuario en el mismo mes.
    const cuentaB = await t.prisma.cuenta.create({ data: { usuarioId: b.id, nombre: 'B' } });
    await t.prisma.movimiento.create({
      data: {
        usuarioId: b.id,
        cuentaId: cuentaB.id,
        tipo: 'GASTO',
        monto: '777',
        moneda: 'ARS',
        fecha: fecha('2026-11-10'),
      },
    });
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  const mensual = async (u: UsuarioDePrueba, periodo: string) =>
    (
      await request(t.server)
        .get(`/api/v1/resumen/mensual?periodo=${periodo}`)
        .set('Authorization', u.auth)
        .expect(200)
    ).body;

  it('resumen de noviembre: totales exactos por moneda', async () => {
    const r = await mensual(a, '2026-11');
    expect(r.periodo).toBe('2026-11');
    expect(r.monedas.map((m: { moneda: string }) => m.moneda)).toEqual(['ARS', 'USD']);

    const [ars, usd] = r.monedas;
    expect(ars).toMatchObject({
      moneda: 'ARS',
      ingresos: '1500.50',
      gastosMovimientos: '550.25',
      gastosTarjeta: '149.75',
      gastos: '700.00',
      saldo: '800.50',
      porcentajeGastado: '46.65',
      comparacionMesAnterior: {
        ingresosAnterior: '1000.00',
        gastosAnterior: '500.00',
        variacionIngresos: '50.05',
        variacionGastos: '40.00',
      },
    });
    expect(usd).toMatchObject({
      moneda: 'USD',
      ingresos: '100.00',
      gastos: '40.00',
      gastosTarjeta: '0.00',
      saldo: '60.00',
      porcentajeGastado: '40.00',
      comparacionMesAnterior: {
        ingresosAnterior: '0.00',
        variacionIngresos: null,
        variacionGastos: null,
      },
    });
  });

  it('gastos por categoría: cuotas suman a la categoría de su compra, de mayor a menor', async () => {
    const [ars] = (await mensual(a, '2026-11')).monedas;
    expect(
      ars.porCategoria.map((c: { nombre: string; total: string; porcentaje: string }) => [
        c.nombre,
        c.total,
        c.porcentaje,
      ]),
    ).toEqual([
      ['Alimentación', '400.00', '57.14'],
      ['Vivienda', '200.00', '28.57'],
      ['Sin categoría', '50.25', '7.18'],
      ['Ropa', '49.75', '7.11'],
    ]);
    const alimentacion = ars.porCategoria[0];
    expect(alimentacion.categoriaId).toEqual(expect.any(String));
    expect(alimentacion.color).toMatch(/^#/);
    expect(alimentacion.icono).toBe('🛒');
    const sinCategoria = ars.porCategoria[2];
    expect(sinCategoria).toMatchObject({ categoriaId: null, color: null, icono: null });
  });

  it('octubre y un mes sin datos', async () => {
    const [ars] = (await mensual(a, '2026-10')).monedas;
    expect(ars).toMatchObject({
      ingresos: '1000.00',
      gastos: '500.00',
      gastosTarjeta: '100.00',
      saldo: '500.00',
    });
    expect((await mensual(a, '2020-01')).monedas).toEqual([]);
  });

  it('el otro usuario solo ve lo suyo', async () => {
    const r = await mensual(b, '2026-11');
    expect(r.monedas).toHaveLength(1);
    expect(r.monedas[0]).toMatchObject({
      moneda: 'ARS',
      ingresos: '0.00',
      gastos: '777.00',
      porcentajeGastado: null,
    });
  });

  it('evolución: serie por moneda con todos los meses, en cero si no hubo datos', async () => {
    const res = await request(t.server)
      .get('/api/v1/resumen/evolucion?meses=3&hasta=2026-11')
      .set('Authorization', a.auth)
      .expect(200);
    expect(res.body).toMatchObject({ desde: '2026-09', hasta: '2026-11' });
    const [ars, usd] = res.body.monedas;
    expect(ars.moneda).toBe('ARS');
    expect(ars.meses).toEqual([
      {
        periodo: '2026-09',
        ingresos: '0.00',
        gastos: '0.00',
        gastosMovimientos: '0.00',
        gastosTarjeta: '0.00',
        saldo: '0.00',
      },
      {
        periodo: '2026-10',
        ingresos: '1000.00',
        gastos: '500.00',
        gastosMovimientos: '400.00',
        gastosTarjeta: '100.00',
        saldo: '500.00',
      },
      {
        periodo: '2026-11',
        ingresos: '1500.50',
        gastos: '700.00',
        gastosMovimientos: '550.25',
        gastosTarjeta: '149.75',
        saldo: '800.50',
      },
    ]);
    expect(usd.moneda).toBe('USD');
    expect(usd.meses.map((m: { saldo: string }) => m.saldo)).toEqual(['0.00', '0.00', '60.00']);
  });

  it('evolución incluye diciembre si el rango lo cubre (movimiento + cuota de diciembre)', async () => {
    const res = await request(t.server)
      .get('/api/v1/resumen/evolucion?meses=1&hasta=2026-12')
      .set('Authorization', a.auth)
      .expect(200);
    expect(res.body.monedas[0].meses[0]).toMatchObject({
      periodo: '2026-12',
      gastosMovimientos: '9999.00',
      gastosTarjeta: '49.75',
      gastos: '10048.75',
    });
  });

  it('valida la query', async () => {
    await request(t.server)
      .get('/api/v1/resumen/mensual?periodo=2026-13')
      .set('Authorization', a.auth)
      .expect(400);
    await request(t.server)
      .get('/api/v1/resumen/evolucion?meses=0')
      .set('Authorization', a.auth)
      .expect(400);
    await request(t.server)
      .get('/api/v1/resumen/evolucion?meses=100')
      .set('Authorization', a.auth)
      .expect(400);
    // Sin período usa el mes actual.
    const actual = await request(t.server)
      .get('/api/v1/resumen/mensual')
      .set('Authorization', a.auth)
      .expect(200);
    expect(actual.body.periodo).toMatch(/^\d{4}-\d{2}$/);
  });
});
