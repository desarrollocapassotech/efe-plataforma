import request from 'supertest';
import {
  type AppDePrueba,
  borrarUsuarios,
  crearAppDePrueba,
  crearUsuario,
  fecha,
  type UsuarioDePrueba,
} from './helpers';

interface CategoriaRes {
  id: string;
  tipo: 'GASTO' | 'INGRESO';
  nombre: string;
  color: string;
  icono: string;
  esDefault: boolean;
  archivada: boolean;
  orden: number;
}

describe('Categorías (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;

  const listar = async (u: UsuarioDePrueba, query = '') =>
    (
      await request(t.server)
        .get(`/api/v1/categorias${query}`)
        .set('Authorization', u.auth)
        .expect(200)
    ).body as CategoriaRes[];
  const post = (u: UsuarioDePrueba, body: object) =>
    request(t.server).post('/api/v1/categorias').set('Authorization', u.auth).send(body);
  const patch = (u: UsuarioDePrueba, id: string, body: object) =>
    request(t.server).patch(`/api/v1/categorias/${id}`).set('Authorization', u.auth).send(body);

  beforeAll(async () => {
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'cat-a');
    b = await crearUsuario(t.server, 'cat-b');
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('el usuario nuevo tiene las categorías de la plantilla, filtrables por tipo', async () => {
    expect(await listar(a)).toHaveLength(18);
    const gastos = await listar(a, '?tipo=GASTO');
    expect(gastos).toHaveLength(13);
    expect(gastos[0]).toMatchObject({ nombre: 'Vivienda', icono: '🏠', esDefault: true, orden: 0 });
    expect(gastos.every((c) => c.tipo === 'GASTO')).toBe(true);
    expect(await listar(a, '?tipo=INGRESO')).toHaveLength(5);
    await request(t.server)
      .get('/api/v1/categorias?tipo=OTRO')
      .set('Authorization', a.auth)
      .expect(400);
  });

  it('crea al final del orden de su tipo, con el color normalizado', async () => {
    const res = await post(a, {
      tipo: 'GASTO',
      nombre: 'Café',
      color: '#aa5500',
      icono: '☕',
    }).expect(201);
    expect(res.body).toMatchObject({
      tipo: 'GASTO',
      nombre: 'Café',
      color: '#AA5500',
      esDefault: false,
      archivada: false,
      orden: 13,
    });
  });

  it('nombre único por usuario y tipo, sin distinguir mayúsculas (409 CATEGORIA_DUPLICADA)', async () => {
    const dup = await post(a, {
      tipo: 'GASTO',
      nombre: 'vivienda',
      color: '#000000',
      icono: 'x',
    }).expect(409);
    expect(dup.body.error.code).toBe('CATEGORIA_DUPLICADA');
    // Mismo nombre en el otro tipo sí se puede.
    await post(a, { tipo: 'INGRESO', nombre: 'Vivienda', color: '#000000', icono: '🏠' }).expect(
      201,
    );
    // Otro usuario puede tener el mismo nombre.
    await post(b, { tipo: 'GASTO', nombre: 'Café', color: '#000000', icono: '☕' }).expect(201);

    const salud = (await listar(a, '?tipo=GASTO')).find((c) => c.nombre === 'Salud')!;
    const renombre = await patch(a, salud.id, { nombre: 'TRANSPORTE' }).expect(409);
    expect(renombre.body.error.code).toBe('CATEGORIA_DUPLICADA');
    // Renombrarse a sí misma con otras mayúsculas no es duplicado.
    await patch(a, salud.id, { nombre: 'salud' }).expect(200);
  });

  it('valida: tipo no se cambia, color e ícono obligatorios', async () => {
    const otros = (await listar(a, '?tipo=GASTO')).find((c) => c.nombre === 'Otros')!;
    expect((await patch(a, otros.id, { tipo: 'INGRESO' }).expect(400)).body.error.code).toBe(
      'VALIDACION',
    );
    await post(a, { tipo: 'GASTO', nombre: 'Sin color', icono: 'x' }).expect(400);
    await post(a, { tipo: 'GASTO', nombre: 'Sin ícono', color: '#000000' }).expect(400);
    await post(a, { tipo: 'GASTO', nombre: 'x', color: 'rojo', icono: 'x' }).expect(400);
  });

  it('archivar la saca del listado salvo con incluirArchivadas', async () => {
    const regalos = (await listar(a, '?tipo=GASTO')).find((c) => c.nombre === 'Regalos')!;
    expect((await patch(a, regalos.id, { archivada: true }).expect(200)).body.archivada).toBe(true);
    expect((await listar(a, '?tipo=GASTO')).some((c) => c.id === regalos.id)).toBe(false);
    expect(
      (await listar(a, '?tipo=GASTO&incluirArchivadas=true')).some((c) => c.id === regalos.id),
    ).toBe(true);
  });

  it('borrar: sin uso → 204; con movimientos → 409 CATEGORIA_EN_USO', async () => {
    const libre = (
      await post(a, { tipo: 'GASTO', nombre: 'Para borrar', color: '#000000', icono: 'x' }).expect(
        201,
      )
    ).body as CategoriaRes;
    await request(t.server)
      .delete(`/api/v1/categorias/${libre.id}`)
      .set('Authorization', a.auth)
      .expect(204);

    const mascotas = (await listar(a, '?tipo=GASTO')).find((c) => c.nombre === 'Mascotas')!;
    const cuenta = await t.prisma.cuenta.create({ data: { usuarioId: a.id, nombre: 'Efectivo' } });
    await t.prisma.movimiento.create({
      data: {
        usuarioId: a.id,
        cuentaId: cuenta.id,
        categoriaId: mascotas.id,
        tipo: 'GASTO',
        monto: '1000',
        moneda: 'ARS',
        fecha: fecha('2026-11-05'),
      },
    });
    const res = await request(t.server)
      .delete(`/api/v1/categorias/${mascotas.id}`)
      .set('Authorization', a.auth)
      .expect(409);
    expect(res.body.error.code).toBe('CATEGORIA_EN_USO');
  });

  it('PUT /categorias/orden reordena en lote', async () => {
    const [primera, segunda] = await listar(a, '?tipo=INGRESO');
    await request(t.server)
      .put('/api/v1/categorias/orden')
      .set('Authorization', a.auth)
      .send([
        { id: primera!.id, orden: 1 },
        { id: segunda!.id, orden: 0 },
      ])
      .expect(204);
    const despues = await listar(a, '?tipo=INGRESO');
    expect(despues[0]!.id).toBe(segunda!.id);
    expect(despues[1]!.id).toBe(primera!.id);

    await request(t.server)
      .put('/api/v1/categorias/orden')
      .set('Authorization', a.auth)
      .send([
        { id: primera!.id, orden: 0 },
        { id: primera!.id, orden: 1 },
      ])
      .expect(400);
  });

  it('aislamiento: las categorías de otro usuario dan 404 y no aparecen', async () => {
    const deA = (await listar(a, '?tipo=GASTO'))[0]!;
    const deB = (await listar(b, '?tipo=GASTO'))[0]!;

    expect((await listar(b)).some((c) => c.id === deA.id)).toBe(false);
    expect((await patch(b, deA.id, { nombre: 'hackeada' }).expect(404)).body.error.code).toBe(
      'NO_ENCONTRADO',
    );
    await request(t.server)
      .delete(`/api/v1/categorias/${deA.id}`)
      .set('Authorization', b.auth)
      .expect(404);

    // Reordenar mezclando una de otro usuario: 404 y no se toca nada.
    await request(t.server)
      .put('/api/v1/categorias/orden')
      .set('Authorization', b.auth)
      .send([
        { id: deB.id, orden: 50 },
        { id: deA.id, orden: 51 },
      ])
      .expect(404);
    const intactaA = await t.prisma.categoria.findUniqueOrThrow({ where: { id: deA.id } });
    const intactaB = await t.prisma.categoria.findUniqueOrThrow({ where: { id: deB.id } });
    expect(intactaA.nombre).not.toBe('hackeada');
    expect(intactaA.orden).toBe(deA.orden);
    expect(intactaB.orden).toBe(deB.orden);
  });
});
