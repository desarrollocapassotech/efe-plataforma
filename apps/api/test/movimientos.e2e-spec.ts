import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  fecha,
  type UsuarioDePrueba,
} from './helpers';

interface MovimientoRes {
  id: string;
  tipo: 'INGRESO' | 'GASTO';
  monto: string;
  moneda: 'ARS' | 'USD';
  fecha: string;
  descripcion: string | null;
  cuenta: { id: string; nombre: string; moneda: string };
  categoria: { id: string; nombre: string; color: string; icono: string } | null;
  recurrenciaId: string | null;
  creadoEn: string;
}
interface Pagina {
  items: MovimientoRes[];
  nextCursor: string | null;
}

describe('Movimientos (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;
  let pesos: string;
  let dolares: string;
  let otraPesos: string;
  let catGasto: { id: string; nombre: string };
  let catIngreso: { id: string; nombre: string };

  const post = (u: UsuarioDePrueba, body: object) =>
    request(t.server).post('/api/v1/movimientos').set('Authorization', u.auth).send(body);
  const patch = (u: UsuarioDePrueba, id: string, body: object) =>
    request(t.server).patch(`/api/v1/movimientos/${id}`).set('Authorization', u.auth).send(body);
  const listar = async (u: UsuarioDePrueba, query = '') =>
    (
      await request(t.server)
        .get(`/api/v1/movimientos${query}`)
        .set('Authorization', u.auth)
        .expect(200)
    ).body as Pagina;

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'mov-a');
    b = await crearUsuario(t.server, 'mov-b');
    const crearCuenta = async (nombre: string, moneda = 'ARS') =>
      (
        await request(t.server)
          .post('/api/v1/cuentas')
          .set('Authorization', a.auth)
          .send({ nombre, moneda })
          .expect(201)
      ).body.id as string;
    pesos = await crearCuenta('Pesos');
    dolares = await crearCuenta('Dólares', 'USD');
    otraPesos = await crearCuenta('Otra en pesos');
    const categorias = await t.prisma.categoria.findMany({ where: { usuarioId: a.id } });
    catGasto = categorias.find((c) => c.nombre === 'Alimentación')!;
    catIngreso = categorias.find((c) => c.nombre === 'Sueldo')!;
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('crea un gasto con la moneda de la cuenta, cuenta y categoría resumidas', async () => {
    const res = await post(a, {
      cuentaId: dolares,
      categoriaId: catGasto.id,
      tipo: 'GASTO',
      monto: '25.5',
      fecha: '2026-11-20',
      descripcion: '  Súper ',
    }).expect(201);
    expect(res.body).toMatchObject({
      tipo: 'GASTO',
      monto: '25.50',
      moneda: 'USD',
      fecha: '2026-11-20',
      descripcion: 'Súper',
      cuenta: { id: dolares, nombre: 'Dólares', moneda: 'USD' },
      categoria: { id: catGasto.id, nombre: 'Alimentación' },
      recurrenciaId: null,
    });
  });

  it('valida: categoría del otro tipo (422), moneda no se manda, monto y fecha', async () => {
    const tipo = await post(a, {
      cuentaId: pesos,
      categoriaId: catIngreso.id,
      tipo: 'GASTO',
      monto: '10',
      fecha: '2026-11-20',
    }).expect(422);
    expect(tipo.body.error.code).toBe('CATEGORIA_TIPO_INVALIDO');

    for (const body of [
      { cuentaId: pesos, tipo: 'GASTO', monto: '10', fecha: '2026-11-20', moneda: 'USD' },
      { cuentaId: pesos, tipo: 'GASTO', monto: '0', fecha: '2026-11-20' },
      { cuentaId: pesos, tipo: 'GASTO', monto: '10', fecha: '2026-13-01' },
      { cuentaId: pesos, tipo: 'TRANSFERENCIA', monto: '10', fecha: '2026-11-20' },
    ]) {
      expect((await post(a, body).expect(400)).body.error.code).toBe('VALIDACION');
    }
  });

  it('no deja cargar en cuentas o categorías archivadas', async () => {
    const archivada = await t.prisma.cuenta.create({
      data: { usuarioId: a.id, nombre: 'Vieja', archivada: true },
    });
    const r1 = await post(a, {
      cuentaId: archivada.id,
      tipo: 'GASTO',
      monto: '1',
      fecha: '2026-11-20',
    }).expect(422);
    expect(r1.body.error.code).toBe('CUENTA_ARCHIVADA');

    const catArchivada = await t.prisma.categoria.create({
      data: {
        usuarioId: a.id,
        tipo: 'GASTO',
        nombre: 'Archivada',
        color: '#000000',
        icono: 'x',
        archivada: true,
      },
    });
    const r2 = await post(a, {
      cuentaId: pesos,
      categoriaId: catArchivada.id,
      tipo: 'GASTO',
      monto: '1',
      fecha: '2026-11-20',
    }).expect(422);
    expect(r2.body.error.code).toBe('CATEGORIA_ARCHIVADA');
  });

  it('PATCH: fecha, monto, descripción y cuenta de la misma moneda; otra moneda → 422', async () => {
    const m = (
      await post(a, { cuentaId: pesos, tipo: 'GASTO', monto: '100', fecha: '2026-11-01' }).expect(
        201,
      )
    ).body as MovimientoRes;
    const res = await patch(a, m.id, {
      fecha: '2026-10-31',
      monto: '150.75',
      descripcion: 'Farmacia',
      cuentaId: otraPesos,
      categoriaId: catGasto.id,
    }).expect(200);
    expect(res.body).toMatchObject({
      fecha: '2026-10-31',
      monto: '150.75',
      descripcion: 'Farmacia',
      cuenta: { id: otraPesos },
      categoria: { id: catGasto.id },
    });

    const moneda = await patch(a, m.id, { cuentaId: dolares }).expect(422);
    expect(moneda.body.error.code).toBe('CUENTA_MONEDA_DISTINTA');
    const tipo = await patch(a, m.id, { categoriaId: catIngreso.id }).expect(422);
    expect(tipo.body.error.code).toBe('CATEGORIA_TIPO_INVALIDO');
    expect((await patch(a, m.id, { tipo: 'INGRESO' }).expect(400)).body.error.code).toBe(
      'VALIDACION',
    );

    // Sacar la categoría.
    expect((await patch(a, m.id, { categoriaId: null }).expect(200)).body.categoria).toBeNull();
  });

  it('editar un movimiento generado por una recurrencia lo desvincula', async () => {
    const recurrencia = await t.prisma.recurrencia.create({
      data: {
        usuarioId: a.id,
        cuentaId: pesos,
        tipo: 'INGRESO',
        monto: '500000',
        moneda: 'ARS',
        descripcion: 'Sueldo',
        diaDelMes: 5,
        desde: fecha('2026-01-01'),
      },
    });
    const generado = await t.prisma.movimiento.create({
      data: {
        usuarioId: a.id,
        cuentaId: pesos,
        tipo: 'INGRESO',
        monto: '500000',
        moneda: 'ARS',
        fecha: fecha('2026-11-05'),
        recurrenciaId: recurrencia.id,
        periodoRecurrencia: '2026-11',
      },
    });
    const res = await patch(a, generado.id, { monto: '520000' }).expect(200);
    expect(res.body.recurrenciaId).toBeNull();
    const db = await t.prisma.movimiento.findUniqueOrThrow({ where: { id: generado.id } });
    expect(db.periodoRecurrencia).toBeNull();
  });

  it('DELETE borra; otro usuario no puede ver, editar ni borrar (404)', async () => {
    const m = (
      await post(a, { cuentaId: pesos, tipo: 'GASTO', monto: '1', fecha: '2026-11-02' }).expect(201)
    ).body as MovimientoRes;

    expect((await listar(b)).items).toHaveLength(0);
    expect((await patch(b, m.id, { monto: '999' }).expect(404)).body.error.code).toBe(
      'NO_ENCONTRADO',
    );
    await request(t.server)
      .delete(`/api/v1/movimientos/${m.id}`)
      .set('Authorization', b.auth)
      .expect(404);

    // B tampoco puede usar la cuenta ni la categoría de A.
    await post(b, { cuentaId: pesos, tipo: 'GASTO', monto: '1', fecha: '2026-11-02' }).expect(404);
    const cuentaB = await t.prisma.cuenta.create({ data: { usuarioId: b.id, nombre: 'B' } });
    await post(b, {
      cuentaId: cuentaB.id,
      categoriaId: catGasto.id,
      tipo: 'GASTO',
      monto: '1',
      fecha: '2026-11-02',
    }).expect(404);

    await request(t.server)
      .delete(`/api/v1/movimientos/${m.id}`)
      .set('Authorization', a.auth)
      .expect(204);
    expect(await t.prisma.movimiento.findUnique({ where: { id: m.id } })).toBeNull();
  });

  describe('listado: filtros y paginación', () => {
    let creados: string[];

    beforeAll(async () => {
      // Usuario limpio de datos previos de este archivo: borro lo creado arriba.
      await t.prisma.movimiento.deleteMany({ where: { usuarioId: a.id } });
      // 120 movimientos en 40 días distintos (3 por día, mismo creadoEn → desempata el id).
      const data = Array.from({ length: 120 }, (_, i) => {
        const dia = String((i % 30) + 1).padStart(2, '0');
        const mes = i < 60 ? '10' : '11';
        const esIngreso = i % 4 === 0;
        return {
          usuarioId: a.id,
          cuentaId: i % 2 === 0 ? pesos : otraPesos,
          categoriaId: esIngreso ? catIngreso.id : catGasto.id,
          tipo: esIngreso ? ('INGRESO' as const) : ('GASTO' as const),
          monto: String(i + 1),
          moneda: 'ARS' as const,
          fecha: fecha(`2026-${mes}-${dia}`),
          descripcion: i % 10 === 0 ? `Supermercado ${i}` : `Gasto ${i}`,
          creadoEn: new Date('2026-11-26T12:00:00Z'),
        };
      });
      await t.prisma.movimiento.createMany({ data });
      creados = (
        await t.prisma.movimiento.findMany({ where: { usuarioId: a.id }, select: { id: true } })
      ).map((m) => m.id);
    });

    it('recorre las 120 en páginas de 50 sin repetir ni saltear, en orden', async () => {
      const vistos: MovimientoRes[] = [];
      let cursor: string | null = null;
      const tamanios: number[] = [];
      do {
        const pagina: Pagina = await listar(a, `?limit=50${cursor ? `&cursor=${cursor}` : ''}`);
        tamanios.push(pagina.items.length);
        vistos.push(...pagina.items);
        cursor = pagina.nextCursor;
      } while (cursor);

      expect(tamanios).toEqual([50, 50, 20]);
      expect(new Set(vistos.map((m) => m.id)).size).toBe(120);
      expect([...vistos.map((m) => m.id)].sort()).toEqual([...creados].sort());
      // Orden: fecha desc y, en el mismo día y creadoEn, id desc.
      for (let i = 1; i < vistos.length; i++) {
        const [ant, act] = [vistos[i - 1]!, vistos[i]!];
        expect(ant.fecha >= act.fecha).toBe(true);
        if (ant.fecha === act.fecha && ant.creadoEn === act.creadoEn)
          expect(ant.id > act.id).toBe(true);
      }
    });

    it('el cursor sigue funcionando aunque se borre el último item de la página', async () => {
      const p1 = await listar(a, '?limit=10');
      const ultimo = p1.items.at(-1)!;
      await t.prisma.movimiento.delete({ where: { id: ultimo.id } });
      const p2 = await listar(a, `?limit=10&cursor=${p1.nextCursor}`);
      expect(p2.items).toHaveLength(10);
      expect(p2.items.some((m) => p1.items.some((x) => x.id === m.id))).toBe(false);
    });

    it('filtra por tipo, cuenta, categoría, rango de fechas y texto', async () => {
      const ingresos = await listar(a, '?tipo=INGRESO&limit=100');
      expect(ingresos.items.length).toBeGreaterThan(0);
      expect(ingresos.items.every((m) => m.tipo === 'INGRESO')).toBe(true);

      const porCuenta = await listar(a, `?cuentaId=${otraPesos}&limit=100`);
      expect(porCuenta.items.every((m) => m.cuenta.id === otraPesos)).toBe(true);

      const porCategoria = await listar(a, `?categoriaId=${catIngreso.id}&limit=100`);
      expect(porCategoria.items.every((m) => m.categoria?.id === catIngreso.id)).toBe(true);

      const noviembre = await listar(a, '?desde=2026-11-01&hasta=2026-11-30&limit=100');
      expect(noviembre.items.every((m) => m.fecha >= '2026-11-01' && m.fecha <= '2026-11-30')).toBe(
        true,
      );
      expect(noviembre.items.length).toBeGreaterThan(0);

      const texto = await listar(a, '?q=SUPERMERCADO&limit=100');
      expect(texto.items.length).toBeGreaterThan(0);
      expect(texto.items.every((m) => m.descripcion?.startsWith('Supermercado'))).toBe(true);

      const combinado = await listar(
        a,
        `?tipo=GASTO&cuentaId=${pesos}&desde=2026-10-10&hasta=2026-10-20&limit=100`,
      );
      expect(
        combinado.items.every(
          (m) =>
            m.tipo === 'GASTO' &&
            m.cuenta.id === pesos &&
            m.fecha >= '2026-10-10' &&
            m.fecha <= '2026-10-20',
        ),
      ).toBe(true);
    });

    it('errores de query: cursor inválido, rango invertido, limit fuera de rango', async () => {
      const cursor = await request(t.server)
        .get('/api/v1/movimientos?cursor=basura')
        .set('Authorization', a.auth)
        .expect(400);
      expect(cursor.body.error.code).toBe('CURSOR_INVALIDO');
      await request(t.server)
        .get('/api/v1/movimientos?desde=2026-12-01&hasta=2026-11-01')
        .set('Authorization', a.auth)
        .expect(400);
      await request(t.server)
        .get('/api/v1/movimientos?limit=500')
        .set('Authorization', a.auth)
        .expect(400);
    });
  });
});
