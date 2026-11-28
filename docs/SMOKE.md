# Smoke test de producción (paso 8.4)

Después de cada deploy importante. Usar una **cuenta de prueba dedicada** (no la propia), creada a mano en la web de producción.

## Automático (API)

```bash
SMOKE_API_URL=https://api.<dominio> SMOKE_FIREBASE_API_KEY=<apiKey de la web app> \
SMOKE_EMAIL=<usuario de prueba> SMOKE_PASSWORD=<clave> node scripts/smoke.ts
```

Recorre: health (con base), login por REST de Firebase, `/me`, crear cuenta, gasto, tarjeta y compra en 3 cuotas, resumen de la tarjeta, resumen del mes e indicadores. Al final borra todo lo que creó. Sale con código 1 si algo falla. La cuenta de prueba tiene que haber aceptado los términos (entrar una vez por la web).

## A mano (web y admin)

- [ ] La web carga en `app.<dominio>` y se puede instalar como app en el celular.
- [ ] Registro con email (checkbox de términos) y con Google.
- [ ] Cargar un gasto desde el "+": aparece en Movimientos y en el Inicio.
- [ ] `/indicadores` sin sesión muestra dólares e inflación con fecha y fuente.
- [ ] El admin carga en `admin.<dominio>`, login de Elías y Flor.
- [ ] Admin → Usuarios plataforma lista a la cuenta de prueba; Métricas muestra números.
- [ ] Facturación del admin (Faktia) sigue funcionando: abrir Facturas.
- [ ] En la consola del navegador no hay avisos de CSP (`Content-Security-Policy-Report-Only`). Si no hay, pasar el header a `Content-Security-Policy` en `firebase.json`.
- [ ] GitHub Actions → Jobs programados → correr `indicadores` a mano: termina en verde.
