/**
 * Smoke test de producción (paso 8.4). Recorre lo básico con un usuario de prueba real y
 * deja todo como estaba. Correr con Node 22 (type stripping):
 *
 *   SMOKE_API_URL=https://api.<dominio> SMOKE_FIREBASE_API_KEY=<apiKey web> \
 *   SMOKE_EMAIL=<usuario de prueba> SMOKE_PASSWORD=<clave> node scripts/smoke.ts
 *
 * Las credenciales solo por variables de entorno (nunca en archivos). Usar una cuenta de
 * prueba dedicada, no la propia.
 */
const env = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta la variable ${nombre}`);
    process.exit(2);
  }
  return valor;
};

const API = `${env('SMOKE_API_URL').replace(/\/+$/, '')}/api/v1`;
const hoy = new Date().toISOString().slice(0, 10);
let token = '';
const pasos: { nombre: string; ok: boolean; detalle?: string }[] = [];

async function pedir<T>(metodo: string, ruta: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`${metodo} ${ruta} → ${res.status} ${texto.slice(0, 200)}`);
  return (texto ? JSON.parse(texto) : undefined) as T;
}

async function paso<T>(nombre: string, accion: () => Promise<T>): Promise<T | undefined> {
  try {
    const resultado = await accion();
    pasos.push({ nombre, ok: true });
    return resultado;
  } catch (error) {
    pasos.push({
      nombre,
      ok: false,
      detalle: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

async function main() {
  await paso('Health', async () => {
    const r = await fetch(`${API}/health`);
    const cuerpo = (await r.json()) as { db: string };
    if (!r.ok || cuerpo.db !== 'ok')
      throw new Error(`health: ${r.status} ${JSON.stringify(cuerpo)}`);
  });

  await paso('Login con Firebase (REST)', async () => {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env('SMOKE_FIREBASE_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: env('SMOKE_EMAIL'),
          password: env('SMOKE_PASSWORD'),
          returnSecureToken: true,
        }),
      },
    );
    const cuerpo = (await r.json()) as { idToken?: string; error?: { message: string } };
    if (!cuerpo.idToken) throw new Error(cuerpo.error?.message ?? `HTTP ${r.status}`);
    token = cuerpo.idToken;
  });
  if (!token) return;

  await paso('GET /me', () => pedir('GET', '/me'));
  const cuenta = await paso('Crear cuenta', () =>
    pedir<{ id: string }>('POST', '/cuentas', { nombre: 'Smoke test', saldoInicial: '0' }),
  );
  const gasto = cuenta
    ? await paso('Crear gasto', () =>
        pedir<{ id: string }>('POST', '/movimientos', {
          cuentaId: cuenta.id,
          tipo: 'GASTO',
          monto: '1.23',
          fecha: hoy,
        }),
      )
    : undefined;
  const tarjeta = await paso('Crear tarjeta', () =>
    pedir<{ id: string }>('POST', '/tarjetas', {
      nombre: 'Smoke test',
      diaCierre: 25,
      diaVencimiento: 5,
    }),
  );
  const compra = tarjeta
    ? await paso('Crear compra en 3 cuotas', async () => {
        const c = await pedir<{ id: string; cuotas: unknown[] }>('POST', '/tarjetas/compras', {
          tarjetaId: tarjeta.id,
          descripcion: 'Smoke test',
          fecha: hoy,
          montoTotal: '3.00',
          cantidadCuotas: 3,
        });
        if (c.cuotas.length !== 3)
          throw new Error(`se esperaban 3 cuotas y vinieron ${c.cuotas.length}`);
        return c;
      })
    : undefined;
  if (tarjeta)
    await paso('Ver resumen de la tarjeta', () =>
      pedir('GET', `/tarjetas/resumen?tarjetaId=${tarjeta.id}`),
    );
  await paso('Resumen del mes', () => pedir('GET', '/resumen/mensual'));
  await paso('Indicadores (público)', async () => {
    const r = await fetch(`${API}/indicadores`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  });

  // Limpieza: siempre, aunque algo haya fallado.
  if (compra) await paso('Borrar compra', () => pedir('DELETE', `/tarjetas/compras/${compra.id}`));
  if (tarjeta) await paso('Borrar tarjeta', () => pedir('DELETE', `/tarjetas/${tarjeta.id}`));
  if (gasto) await paso('Borrar gasto', () => pedir('DELETE', `/movimientos/${gasto.id}`));
  if (cuenta) await paso('Borrar cuenta', () => pedir('DELETE', `/cuentas/${cuenta.id}`));
}

await main();
for (const p of pasos)
  console.log(`${p.ok ? '✓' : '✗'} ${p.nombre}${p.detalle ? ` — ${p.detalle}` : ''}`);
const fallas = pasos.filter((p) => !p.ok).length;
console.log(fallas === 0 ? '\nSmoke test OK' : `\nSmoke test con ${fallas} falla(s)`);
process.exit(fallas === 0 ? 0 : 1);
