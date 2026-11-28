import { hoy, periodoDe, sumarPeriodos } from '@efe/shared/fechas';
import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  type UsuarioDePrueba,
} from './helpers';

type Metodo = 'get' | 'patch' | 'put' | 'delete' | 'post';

/**
 * Test genérico de aislamiento (ARCHITECTURE §9): A crea un recurso de cada tipo y B
 * prueba TODOS los endpoints que reciben un id con esos recursos. Siempre 404 (nunca 403,
 * para no revelar que existe) y los datos de A quedan intactos. Si se agrega un endpoint
 * con id, sumarlo acá.
 */
describe('Aislamiento entre usuarios en todos los endpoints con id (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;
  const ids: Record<string, string> = {};
  const periodo = sumarPeriodos(periodoDe(hoy()), 2);

  const como = (u: UsuarioDePrueba, metodo: Metodo, ruta: string, body?: object) => {
    const req = request(t.server)[metodo](`/api/v1${ruta}`).set('Authorization', u.auth);
    return body ? req.send(body) : req;
  };
  const crear = async (ruta: string, body: object) =>
    ((await como(a, 'post', ruta, body).expect(201)).body as { id: string }).id;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'aisl-a');
    b = await crearUsuario(t.server, 'aisl-b');

    ids.cuenta = await crear('/cuentas', { nombre: 'Banco de A' });
    ids.cuentaUsd = await crear('/cuentas', { nombre: 'Dólares de A', moneda: 'USD' });
    ids.categoria = await crear('/categorias', {
      tipo: 'GASTO',
      nombre: 'Gatos',
      color: '#112233',
      icono: '🐈',
    });
    ids.movimiento = await crear('/movimientos', {
      cuentaId: ids.cuenta,
      tipo: 'GASTO',
      monto: '10',
      fecha: hoy(),
    });
    ids.transferencia = await crear('/transferencias', {
      cuentaOrigenId: ids.cuenta,
      cuentaDestinoId: ids.cuentaUsd,
      montoOrigen: '1000',
      montoDestino: '1',
      fecha: hoy(),
    });
    ids.recurrencia = await crear('/recurrencias', {
      cuentaId: ids.cuenta,
      tipo: 'GASTO',
      monto: '10',
      descripcion: 'Alquiler',
      diaDelMes: 28,
      desde: `${periodo}-01`,
    });
    ids.tarjeta = await crear('/tarjetas', {
      nombre: 'Visa de A',
      diaCierre: 25,
      diaVencimiento: 5,
    });
    ids.compra = await crear('/tarjetas/compras', {
      tarjetaId: ids.tarjeta,
      descripcion: 'Heladera',
      fecha: hoy(),
      montoTotal: '300',
    });
    ids.pago = await crear('/tarjetas/pagos', {
      tarjetaId: ids.tarjeta,
      cuentaId: ids.cuenta,
      periodo,
      monto: '10',
      moneda: 'ARS',
      fecha: hoy(),
    });
    ids.objetivo = await crear('/objetivos', { nombre: 'Viaje de A', montoObjetivo: '1000' });
    ids.aporte = await crear(`/objetivos/${ids.objetivo}/aportes`, { monto: '10', fecha: hoy() });
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  // Bodies válidos: si fallara la validación (400) no se probaría el aislamiento.
  const casos = (): [Metodo, string, object?][] => [
    ['patch', `/cuentas/${ids.cuenta}`, { nombre: 'Mía' }],
    ['delete', `/cuentas/${ids.cuenta}`],
    ['patch', `/categorias/${ids.categoria}`, { nombre: 'Mía' }],
    ['delete', `/categorias/${ids.categoria}`],
    ['put', '/categorias/orden', [{ id: ids.categoria, orden: 0 }]],
    ['patch', `/movimientos/${ids.movimiento}`, { monto: '1' }],
    ['delete', `/movimientos/${ids.movimiento}`],
    ['get', `/movimientos?cuentaId=${ids.cuenta}`],
    ['patch', `/transferencias/${ids.transferencia}`, { montoOrigen: '1' }],
    ['delete', `/transferencias/${ids.transferencia}`],
    ['patch', `/recurrencias/${ids.recurrencia}`, { monto: '1' }],
    ['delete', `/recurrencias/${ids.recurrencia}`],
    ['patch', `/tarjetas/${ids.tarjeta}`, { nombre: 'Mía' }],
    ['delete', `/tarjetas/${ids.tarjeta}`],
    ['get', `/tarjetas/resumen?tarjetaId=${ids.tarjeta}`],
    [
      'put',
      `/tarjetas/${ids.tarjeta}/cierres/${periodo}`,
      { fechaCierre: `${periodo}-01`, fechaVencimiento: `${periodo}-10` },
    ],
    ['delete', `/tarjetas/${ids.tarjeta}/cierres/${periodo}`],
    ['patch', `/tarjetas/compras/${ids.compra}`, { descripcion: 'Mía' }],
    ['delete', `/tarjetas/compras/${ids.compra}`],
    ['delete', `/tarjetas/pagos/${ids.pago}`],
    ['get', `/objetivos/${ids.objetivo}`],
    ['patch', `/objetivos/${ids.objetivo}`, { nombre: 'Mío' }],
    ['delete', `/objetivos/${ids.objetivo}`],
    ['post', `/objetivos/${ids.objetivo}/aportes`, { monto: '1', fecha: hoy() }],
    ['delete', `/objetivos/${ids.objetivo}/aportes/${ids.aporte}`],
  ];

  it('B recibe 404 en cada endpoint con recursos de A', async () => {
    const fallas: string[] = [];
    for (const [metodo, ruta, body] of casos()) {
      const res = await como(b, metodo, ruta, body);
      // GET /movimientos?cuentaId=ajena no es 404: devuelve una lista vacía.
      const esperado = ruta.startsWith('/movimientos?') ? 200 : 404;
      if (res.status !== esperado) fallas.push(`${metodo.toUpperCase()} ${ruta} → ${res.status}`);
      if (esperado === 200) expect((res.body as { items: unknown[] }).items).toEqual([]);
    }
    expect(fallas).toEqual([]);
  });

  it('B tampoco usa recursos de A para crear los suyos', async () => {
    const cuentaB = (
      (await como(b, 'post', '/cuentas', { nombre: 'Cuenta de B' }).expect(201)).body as {
        id: string;
      }
    ).id;
    const intentos: [string, object][] = [
      ['/movimientos', { cuentaId: ids.cuenta, tipo: 'GASTO', monto: '1', fecha: hoy() }],
      [
        '/movimientos',
        { cuentaId: cuentaB, categoriaId: ids.categoria, tipo: 'GASTO', monto: '1', fecha: hoy() },
      ],
      [
        '/transferencias',
        { cuentaOrigenId: cuentaB, cuentaDestinoId: ids.cuenta, montoOrigen: '1', fecha: hoy() },
      ],
      [
        '/recurrencias',
        {
          cuentaId: ids.cuenta,
          tipo: 'GASTO',
          monto: '1',
          descripcion: 'x',
          diaDelMes: 1,
          desde: hoy(),
        },
      ],
      [
        '/tarjetas/compras',
        { tarjetaId: ids.tarjeta, descripcion: 'x', fecha: hoy(), montoTotal: '1' },
      ],
      [
        '/tarjetas/pagos',
        {
          tarjetaId: ids.tarjeta,
          cuentaId: cuentaB,
          periodo,
          monto: '1',
          moneda: 'ARS',
          fecha: hoy(),
        },
      ],
    ];
    const fallas: string[] = [];
    for (const [ruta, body] of intentos) {
      const res = await como(b, 'post', ruta, body);
      if (res.status !== 404) fallas.push(`POST ${ruta} → ${res.status}`);
    }
    expect(fallas).toEqual([]);
  });

  it('los listados de B no muestran nada de A y lo de A sigue intacto', async () => {
    for (const ruta of [
      '/cuentas',
      '/recurrencias',
      '/tarjetas',
      '/objetivos',
      '/tarjetas/pagos',
      '/tarjetas/resumen',
    ]) {
      const res = await como(b, 'get', ruta).expect(200);
      expect(JSON.stringify(res.body)).not.toContain('de A');
    }
    for (const ruta of ['/movimientos', '/transferencias', '/tarjetas/compras']) {
      const res = await como(b, 'get', ruta).expect(200);
      expect((res.body as { items: unknown[] }).items).toEqual([]);
    }
    const categorias = await como(b, 'get', '/categorias').expect(200);
    expect(JSON.stringify(categorias.body)).not.toContain('Gatos');

    expect(await t.prisma.cuenta.count({ where: { usuarioId: a.id } })).toBe(2);
    expect(await t.prisma.movimiento.count({ where: { usuarioId: a.id } })).toBeGreaterThanOrEqual(
      1,
    );
    expect(await t.prisma.objetivo.findUnique({ where: { id: ids.objetivo } })).toMatchObject({
      nombre: 'Viaje de A',
    });
    expect(await t.prisma.aporteObjetivo.count({ where: { objetivoId: ids.objetivo } })).toBe(1);
  });
});
