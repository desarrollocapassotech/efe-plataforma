import { fechaConDia, hoy, periodoDe, sumarPeriodos } from '@efe/shared/fechas';
import {
  ocurrenciasRecurrencia,
  proximaOcurrencia,
  type ReglaRecurrencia,
} from '@efe/shared/recurrencias';
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

interface RecurrenciaRes {
  id: string;
  tipo: string;
  monto: string;
  moneda: string;
  frecuencia: string;
  diaDelMes: number;
  mesDelAnio: number | null;
  activa: boolean;
  proximaFecha: string | null;
  cuenta: { id: string };
  categoria: { id: string } | null;
}

describe('Recurrencias y job (e2e)', () => {
  let t: AppDePrueba;
  let a: UsuarioDePrueba;
  let b: UsuarioDePrueba;
  let cuentaPesos: string;
  let catSueldo: string;
  let catVivienda: string;

  const hoyAr = hoy();
  const periodoHoy = periodoDe(hoyAr);
  /** Día del mes que NO es hoy (para que "hoy" no genere nada y los tests sean determinísticos). */
  const diaQueNoEsHoy = fechaConDia(periodoHoy, 1) === hoyAr ? 2 : 1;
  const hace3Meses = `${sumarPeriodos(periodoHoy, -3)}-01`;

  const post = (u: UsuarioDePrueba, body: object) =>
    request(t.server).post('/api/v1/recurrencias').set('Authorization', u.auth).send(body);
  const patch = (u: UsuarioDePrueba, id: string, body: object) =>
    request(t.server).patch(`/api/v1/recurrencias/${id}`).set('Authorization', u.auth).send(body);
  const correrJob = (job = 'recurrencias', secreto: string | null = SECRETO) => {
    const req = request(t.server).post(`/api/v1/internal/jobs/${job}`);
    return secreto === null ? req : req.set('X-Jobs-Secret', secreto);
  };
  const generados = (recurrenciaId: string) =>
    t.prisma.movimiento.findMany({ where: { recurrenciaId }, orderBy: { fecha: 'asc' } });

  beforeAll(async () => {
    process.env.JOBS_SECRET = SECRETO;
    t = await crearAppDePrueba();
    a = await crearUsuario(t.server, 'rec-a');
    b = await crearUsuario(t.server, 'rec-b');
    cuentaPesos = (
      await request(t.server)
        .post('/api/v1/cuentas')
        .set('Authorization', a.auth)
        .send({ nombre: 'Banco' })
        .expect(201)
    ).body.id;
    const cats = await t.prisma.categoria.findMany({ where: { usuarioId: a.id } });
    catSueldo = cats.find((c) => c.nombre === 'Sueldo')!.id;
    catVivienda = cats.find((c) => c.nombre === 'Vivienda')!.id;
  });

  afterAll(async () => {
    await borrarUsuarios(t.prisma, [a, b]);
    await t.app.close();
  });

  it('al crear genera en el momento lo que corresponde hasta hoy (nada futuro)', async () => {
    const regla: ReglaRecurrencia = { frecuencia: 'MENSUAL', diaDelMes: 31, desde: hace3Meses };
    const res = await post(a, {
      cuentaId: cuentaPesos,
      categoriaId: catSueldo,
      tipo: 'INGRESO',
      monto: '850000',
      descripcion: 'Sueldo',
      diaDelMes: 31,
      desde: hace3Meses,
    }).expect(201);
    const r = res.body as RecurrenciaRes;
    expect(r).toMatchObject({
      tipo: 'INGRESO',
      monto: '850000.00',
      moneda: 'ARS',
      frecuencia: 'MENSUAL',
      activa: true,
    });

    const esperadas = ocurrenciasRecurrencia(regla, hoyAr);
    const movs = await generados(r.id);
    expect(movs.map((m) => m.fecha.toISOString().slice(0, 10))).toEqual(
      esperadas.map((o) => o.fecha),
    );
    expect(movs.map((m) => m.periodoRecurrencia)).toEqual(esperadas.map((o) => o.periodo));
    expect(movs.every((m) => m.fecha.toISOString().slice(0, 10) <= hoyAr)).toBe(true);
    expect(movs.every((m) => m.categoriaId === catSueldo && m.descripcion === 'Sueldo')).toBe(true);

    const proxima = proximaOcurrencia(regla, hoyAr, esperadas.at(-1)?.periodo);
    expect(r.proximaFecha).toBe(proxima?.fecha ?? null);
  });

  it('valida como los movimientos: categoría del otro tipo, anual sin mes, cuenta ajena', async () => {
    const base = {
      cuentaId: cuentaPesos,
      tipo: 'GASTO',
      monto: '300000',
      descripcion: 'Alquiler',
      diaDelMes: 10,
      desde: hace3Meses,
    };
    expect((await post(a, { ...base, categoriaId: catSueldo }).expect(422)).body.error.code).toBe(
      'CATEGORIA_TIPO_INVALIDO',
    );
    expect((await post(a, { ...base, frecuencia: 'ANUAL' }).expect(400)).body.error.code).toBe(
      'VALIDACION',
    );
    expect((await post(a, { ...base, moneda: 'USD' }).expect(400)).body.error.code).toBe(
      'VALIDACION',
    );
    await post(b, base).expect(404);
  });

  it('job: sin secreto o con secreto incorrecto → 401; job desconocido → 404', async () => {
    expect((await correrJob('recurrencias', null).expect(401)).body.error.code).toBe(
      'NO_AUTENTICADO',
    );
    await correrJob('recurrencias', 'incorrecto').expect(401);
    // Un token de usuario no sirve en lugar del secreto.
    await request(t.server)
      .post('/api/v1/internal/jobs/recurrencias')
      .set('Authorization', a.auth)
      .expect(401);
    expect((await correrJob('no-existe').expect(404)).body.error.code).toBe('JOB_DESCONOCIDO');
  });

  it('job: genera lo pendiente y es idempotente (correrlo dos veces no duplica)', async () => {
    // Creada directo en la base, sin materializar (como si el job no hubiera corrido).
    const r = await t.prisma.recurrencia.create({
      data: {
        usuarioId: a.id,
        cuentaId: cuentaPesos,
        categoriaId: catVivienda,
        tipo: 'GASTO',
        monto: '300000',
        moneda: 'ARS',
        descripcion: 'Alquiler',
        diaDelMes: diaQueNoEsHoy,
        desde: fecha(hace3Meses),
      },
    });
    const esperadas = ocurrenciasRecurrencia(
      { frecuencia: 'MENSUAL', diaDelMes: diaQueNoEsHoy, desde: hace3Meses },
      hoyAr,
    );
    expect(esperadas.length).toBeGreaterThan(0);

    const primera = await correrJob().expect(200);
    expect(primera.body).toMatchObject({
      job: 'recurrencias',
      duracionMs: expect.any(Number),
      errores: 0,
    });
    expect(primera.body.generados).toBeGreaterThanOrEqual(esperadas.length);
    expect(await generados(r.id)).toHaveLength(esperadas.length);

    await correrJob().expect(200);
    expect(await generados(r.id)).toHaveLength(esperadas.length);
    const db = await t.prisma.recurrencia.findUniqueOrThrow({ where: { id: r.id } });
    expect(db.ultimoPeriodoGenerado).toBe(esperadas.at(-1)!.periodo);
  });

  it('borrar o editar un movimiento generado no hace que el job lo vuelva a crear', async () => {
    const r = (
      await post(a, {
        cuentaId: cuentaPesos,
        tipo: 'GASTO',
        monto: '15000',
        descripcion: 'Gimnasio',
        diaDelMes: diaQueNoEsHoy,
        desde: hace3Meses,
      }).expect(201)
    ).body as RecurrenciaRes;
    const [primero, segundo] = await generados(r.id);
    expect(primero && segundo).toBeTruthy();

    await request(t.server)
      .delete(`/api/v1/movimientos/${primero!.id}`)
      .set('Authorization', a.auth)
      .expect(204);
    await request(t.server)
      .patch(`/api/v1/movimientos/${segundo!.id}`)
      .set('Authorization', a.auth)
      .send({ monto: '16000' })
      .expect(200);
    const antes = await t.prisma.movimiento.count({
      where: { usuarioId: a.id, descripcion: 'Gimnasio' },
    });

    await correrJob().expect(200);
    const despues = await t.prisma.movimiento.count({
      where: { usuarioId: a.id, descripcion: 'Gimnasio' },
    });
    expect(despues).toBe(antes);
  });

  it('desactivar frena la generación; reactivar no recupera los meses salteados', async () => {
    const r = (
      await post(a, {
        cuentaId: cuentaPesos,
        tipo: 'GASTO',
        monto: '5000',
        descripcion: 'Streaming',
        diaDelMes: diaQueNoEsHoy,
        desde: hace3Meses,
      }).expect(201)
    ).body as RecurrenciaRes;

    const inactiva = await patch(a, r.id, { activa: false }).expect(200);
    expect(inactiva.body).toMatchObject({ activa: false, proximaFecha: null });

    // Simula que estuvo inactiva varios meses: el último generado quedó atrás.
    await t.prisma.movimiento.deleteMany({ where: { recurrenciaId: r.id } });
    await t.prisma.recurrencia.update({
      where: { id: r.id },
      data: { ultimoPeriodoGenerado: sumarPeriodos(periodoHoy, -4) },
    });
    await correrJob().expect(200);
    expect(await generados(r.id)).toHaveLength(0);

    const activa = await patch(a, r.id, { activa: true }).expect(200);
    expect(activa.body.activa).toBe(true);
    expect(activa.body.proximaFecha).not.toBeNull();
    // diaQueNoEsHoy garantiza que "hoy" no tiene ocurrencia: no se generó nada atrasado.
    expect(await generados(r.id)).toHaveLength(0);
    await correrJob().expect(200);
    expect(await generados(r.id)).toHaveLength(0);
  });

  it('anual: genera una vez por año en el mes indicado', async () => {
    const desde = `${sumarPeriodos(periodoHoy, -36)}-01`;
    const mes = Number(sumarPeriodos(periodoHoy, -1).slice(5, 7));
    const r = (
      await post(a, {
        cuentaId: cuentaPesos,
        tipo: 'INGRESO',
        monto: '400000',
        descripcion: 'Aguinaldo',
        frecuencia: 'ANUAL',
        diaDelMes: 15,
        mesDelAnio: mes,
        desde,
      }).expect(201)
    ).body as RecurrenciaRes;
    const esperadas = ocurrenciasRecurrencia(
      { frecuencia: 'ANUAL', diaDelMes: 15, mesDelAnio: mes, desde },
      hoyAr,
    );
    expect(esperadas.length).toBeGreaterThanOrEqual(3);
    expect((await generados(r.id)).map((m) => m.periodoRecurrencia)).toEqual(
      esperadas.map((o) => o.periodo),
    );
  });

  it('borrar la recurrencia deja los movimientos generados (recurrenciaId en null)', async () => {
    const r = (
      await post(a, {
        cuentaId: cuentaPesos,
        tipo: 'GASTO',
        monto: '1000',
        descripcion: 'Seguro',
        diaDelMes: diaQueNoEsHoy,
        desde: hace3Meses,
      }).expect(201)
    ).body as RecurrenciaRes;
    const ids = (await generados(r.id)).map((m) => m.id);
    expect(ids.length).toBeGreaterThan(0);

    await request(t.server)
      .delete(`/api/v1/recurrencias/${r.id}`)
      .set('Authorization', a.auth)
      .expect(204);
    const quedan = await t.prisma.movimiento.findMany({ where: { id: { in: ids } } });
    expect(quedan).toHaveLength(ids.length);
    expect(quedan.every((m) => m.recurrenciaId === null)).toBe(true);
  });

  it('PATCH valida la regla resultante y la moneda de la cuenta', async () => {
    const r = (
      await post(a, {
        cuentaId: cuentaPesos,
        tipo: 'GASTO',
        monto: '1',
        descripcion: 'X',
        diaDelMes: 5,
        desde: hace3Meses,
      }).expect(201)
    ).body as RecurrenciaRes;
    expect((await patch(a, r.id, { frecuencia: 'ANUAL' }).expect(422)).body.error.code).toBe(
      'RECURRENCIA_INVALIDA',
    );
    expect(
      (await patch(a, r.id, { frecuencia: 'ANUAL', mesDelAnio: 3 }).expect(200)).body,
    ).toMatchObject({
      frecuencia: 'ANUAL',
      mesDelAnio: 3,
    });
    // Volver a mensual limpia el mes.
    expect(
      (await patch(a, r.id, { frecuencia: 'MENSUAL' }).expect(200)).body.mesDelAnio,
    ).toBeNull();
    expect((await patch(a, r.id, { hasta: '2000-01-01' }).expect(422)).body.error.code).toBe(
      'RECURRENCIA_INVALIDA',
    );

    const usd = (
      await request(t.server)
        .post('/api/v1/cuentas')
        .set('Authorization', a.auth)
        .send({ nombre: 'USD', moneda: 'USD' })
        .expect(201)
    ).body.id;
    expect((await patch(a, r.id, { cuentaId: usd }).expect(422)).body.error.code).toBe(
      'CUENTA_MONEDA_DISTINTA',
    );
  });

  it('aislamiento: otro usuario no ve, edita ni borra recurrencias ajenas', async () => {
    const r = (
      await request(t.server).get('/api/v1/recurrencias').set('Authorization', a.auth).expect(200)
    ).body as RecurrenciaRes[];
    expect(r.length).toBeGreaterThan(0);
    const listaB = await request(t.server)
      .get('/api/v1/recurrencias?incluirInactivas=true')
      .set('Authorization', b.auth)
      .expect(200);
    expect(listaB.body).toHaveLength(0);
    await patch(b, r[0]!.id, { monto: '1' }).expect(404);
    await request(t.server)
      .delete(`/api/v1/recurrencias/${r[0]!.id}`)
      .set('Authorization', b.auth)
      .expect(404);
  });
});
