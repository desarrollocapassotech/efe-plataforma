# Plan de implementación con Claude Code

Paso a paso para construir la plataforma EFE desde cero hasta el Lanzamiento 1 (EFE Base), más la migración del admin y lo que sigue.

La arquitectura y todas las decisiones están en `docs/ARCHITECTURE.md`. Este plan dice **en qué orden** hacerlo y **qué pedirle a Claude Code** en cada paso.

---

## Cómo usar este plan

### Flujo por paso

1. Abrí Claude Code en la raíz del repo: `cd efe-plataforma && claude`.
2. Si el paso necesita leer código de otro proyecto (gastos, admin viejo), abrilo con `--add-dir`:
   `claude --add-dir ../../gastos --add-dir ../efecapital-portal-admin`
3. Creá la rama del paso: `git checkout -b <rama>`.
4. **Arrancá en plan mode** (`Shift+Tab` dos veces) y pegá el prompt. Revisá el plan que propone, corregí y recién ahí dejalo implementar.
5. Al terminar, pedí: *"Corré lint, typecheck, tests y build de lo que tocaste y arreglá lo que falle"*.
6. Revisá el diff vos (no apruebes a ciegas), commit, PR, merge a `main`.
7. Pedí: *"Actualizá docs/PROGRESS.md marcando el paso X.Y como hecho, con notas de lo que quedó pendiente o se decidió distinto"*. Si cambió una decisión, que actualice también `ARCHITECTURE.md`.
8. `/clear` antes del siguiente paso. Cada paso arranca con contexto limpio: el contexto vive en `CLAUDE.md`, `ARCHITECTURE.md` y `PROGRESS.md`.

### Reglas para todos los prompts

Están en `CLAUDE.md`, pero si Claude Code se desvía, recordale:
- Leer `docs/ARCHITECTURE.md` antes de proponer.
- No usar `number` para plata. No agregar dependencias sin decir por qué.
- Tests para todo cálculo y para el aislamiento por usuario.
- No commitear secretos. No tocar `.env` reales.
- Si algo del plan no cierra, frenar y preguntar en vez de inventar.

### Convenciones

- Ramas: `feat/<fase>-<tema>`, `chore/...`, `fix/...`.
- Commits: Conventional Commits en español (`feat(tarjetas): cálculo de período de resumen`).
- Un paso = un PR. Si un paso queda grande, partilo en dos PRs.

---

## Fase 0 — Preparación (manual, fuera de Claude Code)

Hacelo vos antes de arrancar. Anotá los valores en un gestor de contraseñas, no en el repo.

### 0.1 Seguridad del repo `gastos`
Hay keystores commiteados (`mi-release-key.keystore`, `android/Untitled.jks`).
```bash
cd gastos
git rm --cached mi-release-key.keystore android/Untitled.jks
echo -e "*.keystore\n*.jks\nkeystore.properties" >> .gitignore
git commit -m "chore: sacar keystores del repo"
```
Si el repo fue público o compartido alguna vez: tratá las claves como comprometidas y pedí el reseteo de la *upload key* desde Play Console. Para limpiarlas del historial: `git filter-repo --path mi-release-key.keystore --path android/Untitled.jks --invert-paths` (reescribe historia, coordinalo si alguien más lo clonó).

### 0.2 GitHub
- Crear repo privado `desarrollocapassotech/efe-plataforma` (vacío, sin README).
- Archivar `efecapital-portal-customer` (Settings → Archive).

### 0.3 Neon
- Dos proyectos separados (ver `ARCHITECTURE.md` §10): `efe-plataforma` (producción, solo rama `production`, máx. 2 CU) y `efe-plataforma-desarrollo` (ramas `develop` y `test`, máx. 1 CU). Región São Paulo.
- Guardar para cada rama: connection string **pooled** (`DATABASE_URL`) y **directa** (`DIRECT_URL`).

### 0.4 Firebase (`efecapitaladmin`)
- Authentication → habilitar **Email/contraseña** y **Google**.
- Authentication → Settings → Dominios autorizados: `localhost` (ya está) y después los dominios de producción.
- Templates de email (verificación, reseteo) en español.
- Project settings → Service accounts → generar clave privada (JSON) para la API. Guardarla fuera del repo.
- Registrar una **Web app** nueva "EFE Web" y anotar su config (`apiKey`, `authDomain`, `projectId`, `appId`).
- Hosting → agregar sitios `efe-web` y `efe-admin` (el sitio actual del admin puede quedar como está hasta la Fase 8).

### 0.5 Otros
- Render: cuenta lista (la de Vialto sirve).
- Sentry: proyecto con 3 apps (`efe-api`, `efe-web`, `efe-admin`) o uno con entornos.
- Docker Desktop instalado (para la base de tests e2e). Si no querés Docker, usá la rama `test` de Neon.

### 0.6 Con Flor, antes de la Fase 2 web
- Wireframes del menú, dashboard y carga rápida de gasto (pueden ser en papel o en Claude).
- Decisiones pendientes 1, 2 y 3 de `ARCHITECTURE.md` §11.

---

## Fase 1 — Base del monorepo

### Paso 1.1 — Scaffold del monorepo
**Rama:** `chore/1-monorepo`

```
Leé CLAUDE.md y docs/ARCHITECTURE.md (secciones 2 y 3). Armá el scaffold del monorepo en esta carpeta (ya existen CLAUDE.md y docs/, no los pises):

- pnpm workspaces + Turborepo. package.json raíz con scripts: dev, build, lint, typecheck, test, format.
- .nvmrc con Node 22, .editorconfig, .gitignore completo (node_modules, dist, .env*, excepto .env.example, *.keystore, *.jks, service accounts *.json de firebase), .prettierrc.
- packages/config con: tsconfig.base.json (strict, noUncheckedIndexedAccess), tsconfig para node y para react, configuración de ESLint flat compartida (typescript-eslint + react-hooks donde corresponda), y un preset de Tailwind vacío que vamos a completar en el paso 1.6.
- Carpetas apps/ y packages/ vacías con .gitkeep donde haga falta.
- docs/PROGRESS.md con la lista de pasos de docs/PLAN.md como checklist (todos sin marcar).
- turbo.json con pipelines build (depende de ^build), dev (persistent, sin cache), lint, typecheck, test.
- git init, primer commit, y configurá el remote origin a https://github.com/desarrollocapassotech/efe-plataforma.git (no hagas push).

No crees todavía las apps.
```

**Aceptación**
- `pnpm install` corre sin errores.
- `pnpm turbo lint typecheck` corre (aunque no haya nada que chequear).
- `.gitignore` excluye `.env` y keystores.

**Después:** `git push -u origin main`.

---

### Paso 1.2 — `packages/shared`: dinero, fechas y features
**Rama:** `feat/1-shared-base`

```
Creá packages/shared según docs/ARCHITECTURE.md §3.4 y §4.

1. Configuración: paquete TypeScript que compila a ESM con tsup (salida dist/ con tipos), Vitest para tests. Nombre: @efe/shared.
2. src/dinero:
   - Tipo Moneda = 'ARS' | 'USD' (alineado con el enum de Prisma).
   - Helpers sobre decimal.js: dinero(valor: string|number), sumar, restar, multiplicar, dividir, esCero, comparar, aString2Decimales (siempre "1234.50").
   - dividirEnCuotas(total: string, cantidad: number): string[] → trunca a centavos, la última cuota absorbe la diferencia; la suma de las cuotas es exactamente el total.
   - formatearMoneda(valor: string, moneda: Moneda, opciones?) → formato es-AR ("$ 1.234,50", "US$ 1.234,50").
3. src/fechas:
   - Periodo = string 'YYYY-MM' con validación.
   - periodoDe(fecha), sumarPeriodos(periodo, n), rangoDePeriodo(periodo) → { desde, hasta } en YYYY-MM-DD, periodosEntre(a, b).
   - fechaConDia(periodo, dia) con clamp al último día del mes (31 en febrero → 28/29).
   - Trabajar con fechas como strings YYYY-MM-DD; usar date-fns sin depender de la zona horaria del proceso.
4. src/features: FEATURES, tipo Feature, Plan = 'FREE'|'PREMIUM'|'ASESORAMIENTO', FEATURES_POR_PLAN (PREMIUM incluye todo FREE, ASESORAMIENTO incluye todo PREMIUM; construilo por composición, no copiando listas), tieneFeature(plan, feature).
5. src/schemas: dejá la carpeta con un index y los schemas zod base: MonedaSchema, PeriodoSchema, FechaSchema (YYYY-MM-DD), MontoSchema (string decimal positivo con hasta 2 decimales), PaginacionQuerySchema ({ cursor?, limit 1..100 default 50 }).
6. Tests exhaustivos de dividirEnCuotas (1, 3, 7, 12 cuotas; montos que no dividen exacto; centavos), formatearMoneda, fechaConDia (bisiestos, meses de 30), sumarPeriodos (cruce de año), tieneFeature.
```

**Aceptación**
- `pnpm --filter @efe/shared test` verde.
- `dividirEnCuotas('100.00', 3)` → `['33.33','33.33','33.34']`.
- `fechaConDia('2028-02', 31)` → `'2028-02-29'`.

---

### Paso 1.3 — Scaffold de la API
**Rama:** `feat/1-api-base`

```
Creá apps/api con NestJS 11 según docs/ARCHITECTURE.md §3.1 y §10. Nombre del paquete: @efe/api. Depende de @efe/shared (workspace).

1. Estructura de carpetas de §3.1 (crear solo lo que se usa ahora: config, prisma, common, modules/health).
2. config/: validación del env con zod al arrancar (falla con mensaje claro si falta algo). Variables de §10. Exportá un ConfigService tipado. Creá apps/api/.env.example con todas las variables y comentarios.
3. Prisma: instalá prisma y @prisma/client, schema.prisma en apps/api/prisma con solo el datasource y generator de §5.2 (los modelos van en el paso 1.4). PrismaModule global con PrismaService (onModuleInit connect, enableShutdownHooks).
4. main.ts: prefijo global /api/v1, helmet, CORS con CORS_ORIGINS, ZodValidationPipe global (nestjs-zod), serialización de Decimal a string con 2 decimales (interceptor o patch de toJSON documentado), logger pino (nestjs-pino) con pretty en dev, Swagger en /api/docs solo si NODE_ENV !== 'production'.
5. Filtro global de excepciones: respuesta { error: { code, message, details? } }. Mapeá errores de Prisma conocidos (P2002 → 409 CONFLICTO, P2025 → 404 NO_ENCONTRADO). Clase AppException(code, message, status) para errores de negocio.
6. Módulo health: GET /api/v1/health público → { status, version (de package.json), db: 'ok'|'error' }.
7. @nestjs/throttler global (100 req/min por IP por ahora).
8. Jest configurado (unit) + configuración e2e separada (test/jest-e2e.json) con supertest. Un test e2e de /health.
9. docker-compose.yml en la raíz con un servicio postgres:16 para tests (puerto 5433), y script "test:e2e" que use DATABASE_URL de .env.test.
10. Scripts: dev (nest start --watch), build, start:prod, prisma:generate, prisma:migrate, test, test:e2e.

No implementes auth todavía.
```

**Aceptación**
- `pnpm --filter @efe/api dev` levanta y `GET http://localhost:3000/api/v1/health` responde con `db: "ok"` contra la rama `dev` de Neon.
- Sin `DATABASE_URL`, la API no arranca y dice qué falta.
- `pnpm --filter @efe/api test:e2e` verde.

---

### Paso 1.4 — Schema Prisma del Lanzamiento 1 + seed
**Rama:** `feat/1-schema-l1`

```
Implementá en apps/api/prisma/schema.prisma el schema completo de docs/ARCHITECTURE.md §5.2 (no el de §5.3 de asesoramiento).

1. Copiá los modelos tal cual. Si encontrás un error de Prisma o una relación mal definida, corregilo y anotá el cambio en ARCHITECTURE.md.
2. Generá la migración inicial: prisma migrate dev --name init (contra la rama dev de Neon, usando DIRECT_URL).
3. Creá apps/api/src/modules/categorias/plantilla.ts con las categorías default:
   GASTO: Vivienda 🏠, Alimentación 🛒, Transporte 🚗, Servicios 💡, Salud 🏥, Entretenimiento 🎬, Salidas 🍷, Educación 📚, Ropa 👕, Regalos 🎁, Impuestos 🧾, Mascotas 🐾, Otros 📦
   INGRESO: Sueldo 💼, Honorarios 🧑‍💻, Alquileres 🏘️, Ventas 🏷️, Otros ingresos ➕
   Cada una con color hex de una paleta armónica con los tokens de EFE (azul marino/dorado + neutros + 6–8 colores categóricos distinguibles).
4. prisma/seed.ts: crea (idempotente, por upsert) un usuario ADMIN con el firebaseUid y email que vengan de SEED_ADMIN_FIREBASE_UID y SEED_ADMIN_EMAIL (pueden ser varios separados por coma). Si no están, no crea nada y avisa.
5. Indicá en el resumen final el SQL que generó la migración para que lo revise.
```

**Aceptación**
- Migración aplicada en `dev`. `prisma studio` muestra las tablas.
- `pnpm --filter @efe/api prisma db seed` corre dos veces sin duplicar.

---

### Paso 1.5 — Autenticación, roles y features
**Rama:** `feat/1-auth`

```
Implementá la auth de docs/ARCHITECTURE.md §4 en apps/api.

1. common/auth:
   - FirebaseAdminProvider: inicializa firebase-admin con FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY (reemplazando \n literales).
   - FirebaseAuthGuard global: lee Bearer token, verifyIdToken, busca Usuario por firebaseUid; si no existe lo crea en una transacción junto con las categorías de la plantilla; si está eliminado (eliminadoEn) responde 403 CUENTA_ELIMINADA. Actualiza ultimoAccesoEn como máximo una vez por hora.
   - Decoradores: @Public(), @CurrentUser() (devuelve { id, firebaseUid, email, rol, plan }), @Roles('ADMIN') + RolesGuard, @RequiresFeature(feature) + FeatureGuard usando tieneFeature de @efe/shared → 403 FEATURE_NO_INCLUIDA.
   - Para tests: un modo de test donde el guard acepta un token falso "test:<firebaseUid>:<email>" SOLO si NODE_ENV === 'test'. Que sea imposible activarlo en producción (assert al arrancar).
2. modules/usuarios:
   - GET /me → usuario + features del plan.
   - PATCH /me → nombre, monedaPrincipal, onboardingCompletado (schema zod en @efe/shared/schemas/usuarios).
3. Tests:
   - Unit del guard (token inválido → 401, usuario nuevo → se crea con categorías, eliminado → 403).
   - e2e: GET /me crea el usuario la primera vez; dos usuarios distintos ven cada uno sus datos; endpoint con @Roles('ADMIN') da 403 a un USUARIO; endpoint de prueba con @RequiresFeature('analizador_on') da 403 a FREE.
```

**Aceptación**
- Con un ID token real (sacalo del front en el paso 1.6 o con la REST API de Firebase), `GET /me` crea tu usuario.
- Tests unit y e2e verdes.

---

### Paso 1.6 — Scaffold de la web
**Rama:** `feat/1-web-base`

```
Creá apps/web según docs/ARCHITECTURE.md §3.2. Nombre: @efe/web. Usá como referencia visual el admin actual (pasado con --add-dir): ../efecapital-portal-admin/src/index.css, tailwind.config.ts y su CLAUDE.md (sección "Estilo visual").

1. Vite + React 18 + TypeScript + Tailwind + shadcn/ui (componentes en src/components/ui). Alias @/.
2. Completá el preset de Tailwind en packages/config con los tokens de EFE (colores HSL del admin: primary azul marino, gold, gold-light, success, warning, destructive, neutros; fuentes Inter y Montserrat; radius). La web y el admin lo usan. En la web el radio puede ser algo mayor que en el admin (más amigable para B2C): dejalo como variable --radius propia de cada app.
3. Firebase Auth cliente (config por VITE_FIREBASE_*). AuthProvider con usuario actual, loading, login email/contraseña, login Google (popup en desktop, redirect en móvil), registro, recuperar contraseña, logout.
4. lib/apiClient: fetch wrapper que agrega el ID token (getIdToken), parsea { error: { code, message } } a una clase ApiError, y reintenta una vez con token refrescado si responde 401.
5. TanStack Query con QueryClient configurado (staleTime razonable, sin reintentos en 4xx).
6. Router: rutas públicas /login, /registro, /recuperar; rutas privadas bajo un layout con: barra inferior en móvil (Inicio, Movimientos, Tarjetas, Objetivos, Más) y sidebar en desktop; header con logo EFE. Las páginas privadas por ahora son placeholders.
7. Al entrar a la zona privada, llamar a GET /me (hook useMe). Si onboardingCompletado es false, redirigir a /onboarding (placeholder).
8. Hook useFeature(feature) basado en /me.
9. Pantallas de auth completas, en español, con validación (react-hook-form + zod), mensajes de error de Firebase traducidos (email ya usado, contraseña débil, credenciales inválidas, etc.).
10. PWA con vite-plugin-pwa: manifest (nombre "EFE Capital", colores de marca, íconos a partir de ../efecapital-portal-admin/public/logo-mark.png), service worker con autoUpdate, sin cachear respuestas de la API.
11. .env.example con las variables de §10. Vitest + Testing Library con un test de la pantalla de login.
```

**Aceptación**
- Registro con email y con Google funciona; `/me` crea el usuario en Neon `dev`.
- En el celular (misma red, `vite --host`) se ve como app y se puede instalar.
- Logout limpia el cache de queries.

---

### Paso 1.7 — Mover el admin al monorepo
**Rama:** `chore/1-admin-monorepo`

```
Mové el portal admin al monorepo como apps/admin. Fuente: ../efecapital-portal-admin (pasado con --add-dir).

1. Copiá todo menos .git, node_modules, dist, .firebase, bun.lockb, package-lock.json y .env (sí el .env.example).
2. package.json: nombre @efe/admin, scripts dev (puerto 5174), build, lint, typecheck, test. Sacá lovable-tagger. Unificá versiones con la web donde sea posible (firebase, react, tanstack, etc.) sin romper nada.
3. Que use el tsconfig y el preset de Tailwind de packages/config, manteniendo su --radius de 2px y su estilo actual (no cambiar la UI).
4. Actualizá apps/admin/CLAUDE.md: rutas relativas que cambiaron (Faktia ahora queda en ../../../../FAKTIA respecto de apps/admin; verificalo), y agregá una sección "Migración en curso" que diga: clientes/brokers/planes/servicios siguen en Firestore hasta la Fase 11; módulos nuevos van contra la API (@efe/api).
5. Eliminá: src/data/mockData.ts si no se usa, y los módulos Mensajes e Informes (páginas, rutas, ítems de menú, previewStore y lo asociado, notificaciones push de mensajes). Dejá anotado en PROGRESS.md qué se borró.
6. Verificá que el build pasa y que el login, clientes, facturas y facturación mensual siguen funcionando en local contra Firestore y Faktia.

Mostrame la lista de archivos borrados antes de borrarlos.
```

**Aceptación**
- `pnpm --filter @efe/admin dev` funciona igual que el admin viejo (Flor puede facturar).
- `pnpm turbo build` compila las tres apps.

**Después:** archivá el repo viejo `efecapital-portal-admin` en GitHub *después* de la Fase 8 (cuando el deploy salga del monorepo).

---

## Fase 2 — Finanzas personales (Módulo 1)

### Paso 2.1 — Cuentas y categorías (API)
**Rama:** `feat/2-cuentas-categorias`

```
Implementá los módulos cuentas y categorias en apps/api según docs/ARCHITECTURE.md §5.1, §5.2 y §6.

1. Schemas zod en @efe/shared/schemas (create, update, respuesta). Los DTOs de Nest se crean desde esos schemas.
2. Cuentas: CRUD. GET /cuentas devuelve cada cuenta con saldoActual = saldoInicial + ingresos − gastos + transferencias entrantes (montoDestino) − salientes (montoOrigen) − pagos de resumen. Calculalo con agregados SQL (groupBy o $queryRaw tipado), no trayendo todos los movimientos. Opción ?incluirArchivadas.
   DELETE: si tiene movimientos/transferencias/recurrencias/pagos → 409 CUENTA_CON_MOVIMIENTOS (el front ofrece archivar).
   No permitir cambiar la moneda de una cuenta con movimientos (409 CUENTA_MONEDA_BLOQUEADA).
3. Categorías: CRUD con ?tipo. Nombre único por usuario y tipo (409 CATEGORIA_DUPLICADA). DELETE con movimientos/recurrencias/compras → 409 CATEGORIA_EN_USO. PATCH de orden en lote: PUT /categorias/orden con [{ id, orden }].
4. Todos los queries filtran por usuarioId del @CurrentUser. Recurso de otro usuario → 404 (no 403, para no revelar existencia).
5. Tests e2e: CRUD feliz, validaciones, aislamiento entre dos usuarios, saldo con todos los tipos de operación (preparado con inserts directos de Prisma para transferencias/pagos que todavía no tienen endpoint).
```

---

### Paso 2.2 — Movimientos y transferencias (API)
**Rama:** `feat/2-movimientos`

```
Implementá movimientos y transferencias en apps/api (ARCHITECTURE §5 y §6).

Movimientos:
- POST: cuentaId debe ser del usuario y no estar archivada; categoriaId (opcional) del usuario y del mismo tipo que el movimiento (si no → 422 CATEGORIA_TIPO_INVALIDO); la moneda se toma de la cuenta (no se recibe).
- GET con filtros desde, hasta, tipo, cuentaId, categoriaId, q (búsqueda en descripción, ILIKE) y paginación por cursor (orden fecha desc, creadoEn desc, id). Incluir categoría y cuenta resumidas en cada item.
- PATCH: permite cambiar fecha (no hay "meses" como en el gastos viejo: es solo un campo), cuenta (si cambia la moneda → 422), categoría, monto, descripción. Si el movimiento vino de una recurrencia, al editarlo se desvincula (recurrenciaId y periodoRecurrencia a null) para que el job no lo regenere: documentalo.
- DELETE.

Transferencias:
- POST con cuentaOrigenId ≠ cuentaDestinoId, ambas del usuario. Si las monedas son iguales, montoDestino = montoOrigen (si viene distinto → 422). Si son distintas, se requieren ambos montos (cotización implícita, devolverla calculada en la respuesta).
- GET paginado, PATCH, DELETE.

Tests e2e: filtros y paginación (crear 120 movimientos y recorrer páginas), validaciones de tipo/moneda, aislamiento, transferencia ARS→USD.
```

---

### Paso 2.3 — Recurrencias + job
**Rama:** `feat/2-recurrencias`

```
Implementá recurrencias en apps/api (ARCHITECTURE §5.1 "Recurrencias", §8).

1. CRUD de recurrencias (mismas validaciones de cuenta/categoría/tipo que movimientos). frecuencia MENSUAL (diaDelMes) o ANUAL (diaDelMes + mesDelAnio).
2. Servicio materializarRecurrencias(hasta: fecha): para cada recurrencia activa, genera los Movimiento faltantes desde max(desde, último generado) hasta 'hasta' (o recurrencia.hasta), con fecha = fechaConDia(periodo, diaDelMes) de @efe/shared y periodoRecurrencia = periodo. Idempotente gracias al unique (recurrenciaId, periodoRecurrencia): usá createMany con skipDuplicates. Solo genera movimientos con fecha <= hoy (no futuros).
3. Al crear una recurrencia, materializar en el momento lo que corresponda hasta hoy.
4. modules/jobs: POST /internal/jobs/:job, @Public pero protegido con header X-Jobs-Secret comparado en tiempo constante con JOBS_SECRET. Job 'recurrencias' llama a materializarRecurrencias(hoy). Respuesta con cantidad generada. Loguear inicio/fin/duración.
5. Al borrar una recurrencia, sus movimientos quedan (recurrenciaId pasa a null por SetNull).
6. Tests: unit del cálculo (31 en meses cortos, anual, desde en el medio del mes, hasta), e2e de idempotencia (correr el job dos veces) y del secret inválido (401).
```

---

### Paso 2.4 — Resumen mensual y evolución (API)
**Rama:** `feat/2-resumen`

```
Implementá el módulo resumen en apps/api (ARCHITECTURE §5.1 "Gasto del mes", §6).

GET /resumen/mensual?periodo=YYYY-MM → por cada moneda con datos:
{
  moneda,
  ingresos, gastos, saldo, porcentajeGastado (gastos/ingresos, null si ingresos = 0),
  gastosMovimientos, gastosTarjeta (suma de cuotas con periodoResumen = periodo),
  porCategoria: [{ categoriaId, nombre, color, icono, total, porcentaje }] (incluye cuotas por la categoría de su compra; "Sin categoría" si es null),
  comparacionMesAnterior: { ingresos, gastos } (variación %)
}
GET /resumen/evolucion?meses=12 → serie por mes y moneda: ingresos, gastos (movimientos + cuotas), saldo.

Todo con agregados en SQL ($queryRaw tipado con Prisma.sql, o groupBy), nunca trayendo filas. Agregá los índices que falten y explicá por qué.
Tests e2e con un set de datos armado a mano donde sepamos el resultado exacto (incluyendo cuotas en el período, transferencias que NO deben contar y pagos de resumen que NO deben contar).
```

---

### Paso 2.5 — Web: onboarding, cuentas y categorías
**Rama:** `feat/2-web-cuentas`
**Antes:** tener los wireframes del paso 0.6.

```
En apps/web implementá (ARCHITECTURE §3.2):

1. Onboarding (/onboarding), 3 pasos cortos: nombre y moneda principal → crear al menos una cuenta (sugerencias: Efectivo, Banco, Mercado Pago; con moneda) → listo (PATCH /me onboardingCompletado). Se puede saltear el paso 2 creando "Efectivo" por defecto.
2. Cuentas (/mas/cuentas): listado con saldo actual por cuenta y total por moneda, alta/edición en diálogo (sheet en móvil), archivar, borrar (si la API responde CUENTA_CON_MOVIMIENTOS, ofrecer archivar).
3. Categorías (/mas/categorias): tabs Gastos/Ingresos, alta/edición con selector de emoji y color, reordenar con drag (dnd-kit) o flechas en móvil, archivar.
4. Componentes compartidos: MoneyInput (teclado numérico en móvil, formato es-AR mientras se escribe, devuelve string decimal), CurrencyAmount (usa formatearMoneda), ColorPicker, EmojiPicker liviano.
5. Usá como referencia de UX los componentes de ../../gastos/src (CategoryList, MonthNavigator) pero reescribilos con la arquitectura nueva (features/, hooks con TanStack Query, sin estado global).
6. Estados vacíos, de carga y de error en cada pantalla. Invalidaciones de queries correctas tras cada mutación.
```

---

### Paso 2.6 — Web: movimientos y carga rápida
**Rama:** `feat/2-web-movimientos`

```
En apps/web implementá:

1. Carga rápida de gasto/ingreso: botón flotante (como FloatingExpenseButton de ../../gastos) que abre un sheet con: tipo (gasto/ingreso), MoneyInput enfocado, categorías como grilla de chips con emoji (las más usadas primero), cuenta (recordar la última usada), fecha (hoy por defecto), descripción opcional. Guardar en 2 toques. Optimistic update.
2. Movimientos (/movimientos): MonthNavigator arriba, filtros (tipo, cuenta, categoría, búsqueda) en un sheet, lista agrupada por día con total diario, scroll infinito con la paginación por cursor. Tap en un item → editar/borrar.
3. Transferencias: desde el menú de acciones del botón flotante y desde Cuentas. Si las monedas difieren, pedir ambos montos y mostrar la cotización implícita.
4. Recurrencias (/mas/recurrentes): listado y ABM. Al cargar un ingreso, opción "se repite todos los meses" que crea la recurrencia.
5. Revisá AddExpense, AddIncome, MonthDetail y Transfers de ../../gastos/src/pages como referencia de flujo; no copies el modelo de datos.
```

---

### Paso 2.7 — Web: dashboard
**Rama:** `feat/2-web-dashboard`

```
Usá la skill de dataviz si está disponible. En apps/web implementá el dashboard (/) con datos de GET /resumen/mensual y /resumen/evolucion:

1. Selector de mes (MonthNavigator) y de moneda si el usuario tiene más de una.
2. Tarjetas: Ingresos del mes, Gastos del mes (con desglose movimientos/tarjeta), Saldo disponible, % de ingresos gastado (barra).
3. Distribución de gastos por categoría (donut o barras horizontales, con la categoría y su color; tap → lista de movimientos filtrada).
4. Evolución mensual de ingresos vs gastos (12 meses, barras o líneas).
5. Comparación con el mes anterior (variación % con color semántico).
6. Bloque "Comprometido en tarjetas" (placeholder hasta la Fase 3) y "Objetivos" (placeholder hasta la Fase 4).
7. Recharts (como en gastos/ExpenseChart). Accesible, legible en 360px de ancho, mismos colores de categorías.
```

**Aceptación de la Fase 2:** podés usar la web en vez de `gastos` para el mes en curso (sin tarjetas).

---

## Fase 3 — Tarjetas de crédito (Módulo 2)

### Paso 3.1 — Cálculos de tarjeta en `shared`
**Rama:** `feat/3-tarjetas-calculos`

```
En packages/shared/src/tarjetas implementá, según docs/ARCHITECTURE.md §5.1 (filas "Período de resumen", "Cálculo del período", "Montos de cuota"):

1. calcularResumen(fechaCompra: 'YYYY-MM-DD', tarjeta: { diaCierre, diaVencimiento }, overrides: { periodo, fechaCierre, fechaVencimiento }[]) → { periodo, fechaCierre, fechaVencimiento } del primer resumen que incluye esa compra.
   Regla: primer cierre con fechaCierre >= fechaCompra. Para cada mes candidato, si hay override cuyo fechaCierre cae en ese mes, usar el override; si no, fechaConDia(mes, diaCierre). Vencimiento: override o la próxima fecha con diaVencimiento estrictamente posterior al cierre. periodo = YYYY-MM del vencimiento.
2. generarCuotas(compra: { fecha, montoTotal, cantidadCuotas }, tarjeta, overrides) → [{ numero, monto, periodoResumen }]. La cuota n va en el resumen n-1 posterior al de la cuota 1. Montos con dividirEnCuotas.
3. Tests exhaustivos (tabla de casos): compra el mismo día del cierre (entra), un día después (siguiente), cierre 31 en febrero, vencimiento antes que el cierre en el mes (vence el mes siguiente), override que adelanta un cierre, 1 y 18 cuotas, cruce de año, centavos.
Escribí primero los tests con los casos y mostrámelos antes de implementar.
```

---

### Paso 3.2 — Tarjetas, compras y pagos (API)
**Rama:** `feat/3-tarjetas-api`

```
Implementá el módulo tarjetas en apps/api (ARCHITECTURE §5.2 y §6):

1. Tarjetas CRUD (diaCierre/diaVencimiento 1..31, ultimos4 opcional de exactamente 4 dígitos). DELETE con compras → 409, ofrecer archivar.
2. PUT /tarjetas/:id/cierres/:periodo (override). Al crear/editar un override o cambiar diaCierre/diaVencimiento, recalcular periodoResumen de las cuotas de esa tarjeta con período >= al afectado, en una transacción (servicio recalcularPeriodos usando generarCuotas de @efe/shared).
3. Compras: POST valida tarjeta y categoría (tipo GASTO), crea compra + cuotas (generarCuotas) en transacción, moneda ARS o USD (una tarjeta puede tener compras en ambas). PATCH regenera cuotas. DELETE en cascada. GET con filtros y paginación.
4. GET /tarjetas/resumen?tarjetaId&periodo → fechas del resumen, cuotas (con descripción de compra, n/total), total por moneda, pagos registrados, saldo pendiente.
   Sin tarjetaId → todas las tarjetas.
   Sin periodo → el próximo a vencer.
5. GET /tarjetas/compromisos?meses=12 → por período y moneda: total, y desglose por tarjeta. Es el "cuánto tengo comprometido".
6. Pagos de resumen: POST/GET/DELETE. cuentaId del usuario y misma moneda que el pago.
7. Las cuotas NO afectan el saldo de las cuentas (solo los pagos de resumen). Verificá que el saldo de cuentas incluye los pagos y que /resumen/mensual ya cuenta las cuotas (paso 2.4).
8. Tests e2e: compra en 3 cuotas aparece en 3 resúmenes, cambio de cierre mueve cuotas, aislamiento, compromisos.
```

---

### Paso 3.3 — Web: tarjetas
**Rama:** `feat/3-tarjetas-web`

```
En apps/web implementá la sección Tarjetas:

1. Listado de tarjetas con: próximo vencimiento, total a pagar (por moneda), barra de días hasta el cierre.
2. Alta/edición de tarjeta (nombre, red con ícono, últimos 4 opcional, día de cierre y de vencimiento, color).
3. Carga de compra: desde el botón flotante (opción "Con tarjeta"), con tarjeta, monto total o monto por cuota (toggle; si es por cuota, calcular total), cantidad de cuotas (chips 1/3/6/12/18 + otro), categoría, fecha, descripción. Mostrar antes de guardar en qué resumen cae la primera cuota y la última (usando calcularResumen de @efe/shared en el front).
4. Detalle de resumen: selector de período, fechas de cierre y vencimiento (editables → override), lista de cuotas, total, botón "Registrar pago" (cuenta + monto, por defecto el total).
5. Pantalla "Comprometido": barras por mes de los próximos 12 meses, apiladas por tarjeta, tap → detalle del resumen.
6. Dashboard: reemplazar el placeholder por "Próximo resumen" y "Comprometido en los próximos 3 meses".
7. Usá ProjectedExpenses de ../../gastos como referencia de lo que ya le resultaba útil a Elías.
```

---

## Fase 4 — Objetivos financieros (Módulo 3)

### Paso 4.1 — Objetivos (shared + API + web)
**Rama:** `feat/4-objetivos`

```
Implementá objetivos de punta a punta (ARCHITECTURE §5):

1. packages/shared/src/objetivos: calcularAvance({ montoObjetivo, aportes, fechaObjetivo?, aporteMensualPlaneado?, hoy }) → { acumulado, porcentaje (tope 100), faltante, mesesRestantes, aporteMensualSugerido (faltante / mesesRestantes, null sin fecha), fechaEstimada (con aporteMensualPlaneado o promedio de aportes de los últimos 3 meses), enCamino: boolean }. Tests.
2. API: CRUD de objetivos + aportes (POST/DELETE). Al llegar al 100% se puede marcar CUMPLIDO (no automático). GET devuelve cada objetivo con el cálculo.
3. Web (/objetivos): tarjetas con ícono, barra de avance, acumulado/objetivo, fecha y aporte sugerido, "en camino" o "atrasado". Alta con plantillas (Auto 🚗, Viaje ✈️, Vivienda 🏠, Fondo de emergencia 🛟, Proyecto 🚀, Patrimonio 📈, Otro). Detalle con historial de aportes y botón "Aportar".
4. Fondo de emergencia: en el alta, sugerir monto = 3 a 6 meses del promedio de gastos (de /resumen/evolucion), con explicación.
5. Dashboard: bloque con los 2–3 objetivos activos.
```

---

## Fase 5 — Indicadores económicos (Módulo 4)

### Paso 5.1 — Fuentes e ingesta
**Rama:** `feat/5-indicadores`

```
Implementá el módulo indicadores en apps/api (ARCHITECTURE §7).

1. Primero investigá y mostrame: endpoints actuales de DolarApi (oficial, MEP/bolsa, CCL) y de ArgentinaDatos o la API de series de datos.gob.ar para IPC mensual; formato de respuesta, límites, términos de uso. Usá WebFetch. Proponé cuál usar para cada indicador y frená para que confirme.
2. Interfaz ProveedorIndicadores y un adaptador por fuente, con timeout, validación zod de la respuesta externa (si el formato cambia, falla de forma explícita) y mapeo a { codigo, fecha, valor, fuente, urlFuente }.
3. Servicio ingestarIndicadores(): corre todos los proveedores con Promise.allSettled, upsert por (codigo, fecha), loguea resultados, reporta fallas a Sentry (o al logger si no hay DSN).
4. Job 'indicadores' en POST /internal/jobs/indicadores.
5. GET /indicadores (público): último valor de cada código + brecha MEP/oficial y CCL/oficial + IPC acumulado del año (calculado) + variación vs día/mes anterior; cada valor con fecha y fuente.
   GET /indicadores/:codigo/historico.
   Cache en memoria de 5 minutos.
6. Admin: GET/PUT /admin/indicadores para corregir manualmente un valor (auditado, fuente "Carga manual EFE").
7. Script para cargar histórico inicial (últimos 24 meses de IPC y 90 días de dólares) si las fuentes lo permiten.
8. Tests con respuestas externas mockeadas (fixtures guardados), incluyendo fuente caída.
9. Documentá en ARCHITECTURE §7 las fuentes elegidas y sus condiciones.
```

### Paso 5.2 — Web: panel de indicadores
**Rama:** `feat/5-indicadores-web`

```
En apps/web:
1. Página /indicadores: dólar oficial, MEP, CCL (compra/venta), brecha, inflación del último mes y acumulada del año. Cada tarjeta con fecha de actualización y fuente visibles (requisito del producto). Mini gráfico de 30 días para dólares y de 12 meses para inflación.
2. Widget compacto en el dashboard (MEP, oficial, brecha, última inflación).
3. Funciona sin login también (ruta pública /indicadores), con CTA a registrarse.
```

---

## Fase 6 — Admin: módulos de la plataforma

### Paso 6.1 — Usuarios, métricas, auditoría e indicadores en el admin
**Rama:** `feat/6-admin-plataforma`

```
1. API (modules/admin, todo con @Roles('ADMIN')):
   - GET /admin/usuarios: filtros (email, plan, rol, activo en los últimos N días, registrado entre fechas), orden, paginación. Cada usuario con cantidad de movimientos, último acceso, plan.
   - GET /admin/usuarios/:id: detalle sin datos financieros sensibles (solo contadores), para respetar privacidad.
   - PATCH /admin/usuarios/:id/plan: cambio manual (para clientes de asesoramiento o pruebas), auditado.
   - GET /admin/metricas: registros por día (30 días), activos 7/30 días, usuarios con al menos 1 movimiento, movimientos/día, % que completó onboarding, uso por módulo (cuentas con tarjetas, con objetivos).
   - GET /admin/auditoria: filtros y paginación.
2. Admin (apps/admin): cliente HTTP para @efe/api reutilizando el ID token de Firebase que ya maneja (mismo proyecto). Nuevas secciones en el menú: "Usuarios plataforma", "Métricas", "Indicadores", "Auditoría", siguiendo AL PIE DE LA LETRA el patrón de listados y el estilo de apps/admin/CLAUDE.md (filtros + Buscar + badges, tabla ordenable, ojo → panel lateral, móvil en tarjetas).
3. Métricas con gráficos simples (skill dataviz si está disponible).
4. Flor y Elías tienen que tener rol ADMIN en la base (seed del paso 1.4).
```

---

## Fase 7 — Seguridad, privacidad y cumplimiento

### Paso 7.1 — Auditoría, límites y datos del usuario
**Rama:** `feat/7-seguridad`

```
Implementá ARCHITECTURE §9 en apps/api y apps/web:

1. AuditoriaService + decorador @Auditar('accion') o interceptor; registrar: baja de cuenta, exportación, cambios de plan, acciones admin, correcciones de indicadores. Guardar IP.
2. Throttler: límites más estrictos para DELETE /me, /me/exportar (3/hora) y endpoints admin.
3. GET /me/exportar: JSON con todos los datos del usuario (cuentas, categorías, movimientos, transferencias, recurrencias, tarjetas, compras, cuotas, pagos, objetivos, aportes, perfiles). Streaming si es grande.
4. DELETE /me: pide confirmación (body { confirmacion: "ELIMINAR" }), marca eliminadoEn, revoca refresh tokens en Firebase. Job 'purgar-cuentas': a los 30 días borra en cascada en Postgres y borra el usuario en Firebase. Si el usuario vuelve a entrar dentro de los 30 días: pantalla "Tu cuenta está programada para eliminarse" con opción de recuperarla (endpoint POST /me/restaurar).
5. Términos y privacidad: tabla o campos para registrar versión aceptada y fecha (agregá terminosVersion y terminosAceptadosEn a Usuario con una migración). En registro, checkbox obligatorio. Las páginas /terminos y /privacidad renderizan Markdown desde apps/web/src/legal/*.md (el texto lo provee EFE; dejá un placeholder claramente marcado).
6. Web, en /mas/perfil: exportar mis datos (descarga JSON), eliminar cuenta (con doble confirmación).
7. Sentry en api, web y admin (sin enviar PII: scrubbing de emails y montos en breadcrumbs).
8. Tests e2e: exportación completa, borrado y purga, restauración, aislamiento en TODOS los endpoints (un test genérico que recorra los endpoints con recursos de otro usuario y espere 404).
9. Revisión final: listá cualquier endpoint que no filtre por usuarioId.
```

---

## Fase 8 — Deploy a producción

### Paso 8.1 — CI
**Rama:** `chore/8-ci`

```
Creá .github/workflows/ci.yml: en PR y push a main, con pnpm cache: install --frozen-lockfile, turbo lint typecheck test build, servicio postgres para los e2e de la API, y chequeo de migraciones (prisma migrate diff --from-migrations --to-schema-datamodel --exit-code contra la shadow DB del servicio postgres).
Que falle si alguien agrega un .env o un archivo *.keystore/*.jks.
```

### Paso 8.2 — API en Render
**Manual + Claude Code**

```
Creá render.yaml (Blueprint) para la API: web service Node, plan starter, región Oregon u Ohio (o la más cercana a Neon São Paulo que ofrezca Render: verificá), rootDir del repo, buildCommand "corepack enable && pnpm install --frozen-lockfile && pnpm turbo build --filter=@efe/api", preDeployCommand "pnpm --filter @efe/api prisma migrate deploy", startCommand "pnpm --filter @efe/api start:prod", healthCheckPath /api/v1/health, autoDeploy en main, y la lista de envVars (sync: false para secretos). Explicame qué tengo que cargar a mano en el dashboard.
```

Manual: conectar el repo en Render, cargar las variables (`DATABASE_URL`/`DIRECT_URL` de la rama `main` de Neon, Firebase, `JOBS_SECRET` largo y aleatorio, `CORS_ORIGINS` con los dominios de prod, Sentry), primer deploy, correr el seed con tus UIDs y los de Flor.

### Paso 8.3 — Web y admin en Firebase Hosting
**Rama:** `chore/8-hosting`

```
1. firebase.json en la raíz con hosting multi-sitio: target "web" → apps/web/dist, target "admin" → apps/admin/dist, ambos con rewrite SPA a /index.html, headers de seguridad (CSP razonable que permita Firebase Auth, la API y Sentry; X-Frame-Options DENY; Referrer-Policy) y cache largo para assets con hash, sin cache para index.html y el service worker.
2. .firebaserc con proyecto efecapitaladmin y targets web → efe-web, admin → efe-admin.
3. Workflows deploy-web.yml y deploy-admin.yml: en push a main con cambios en apps/<app>/** o packages/**, build con las variables VITE_* de GitHub Secrets y deploy con FirebaseExtended/action-hosting-deploy (service account en secret).
4. Workflow jobs.yml con los crons de ARCHITECTURE §8 (en UTC: ART = UTC−3) llamando a la API con curl y el secret; que falle si la respuesta no es 2xx.
```

Manual: dominios personalizados (`app.`, `admin.`, `api.`), agregarlos a dominios autorizados de Firebase Auth y a `CORS_ORIGINS`.

### Paso 8.4 — Smoke test de producción
```
Escribí un checklist de smoke test en docs/SMOKE.md y un script scripts/smoke.ts que, con un usuario de prueba de producción (credenciales en variables de entorno), recorra: login por REST de Firebase, /me, crear cuenta, crear gasto, crear compra en cuotas, ver resumen, borrar todo. Correlo contra producción y mostrame el resultado.
```

---

## Fase 9 — Migrar tus datos de `gastos`

### Paso 9.1 — Script de migración
**Rama:** `feat/9-migracion-gastos`

```
Creá scripts/migracion-gastos (con --add-dir ../../gastos para leer el código viejo).

Contexto del modelo viejo (verificalo leyendo ../../gastos/src/hooks/useExpenseStore.tsx y src/pages/Transfers.tsx):
- users/{uid}/categories, users/{uid}/projects (= cuentas), users/{uid}/months/{YYYY-MM}/expenses y incomes.
- Las cuotas son N gastos con installments { total, current, originalAmount }.
- Las transferencias se guardaban como un gasto (categoría "Transferencias") + un ingreso con descripciones "Transferencia a X" / "Transferencia de X".
- Los montos son number (float).

El script:
1. Lee Firestore del proyecto mis-gastos-mes con una service account (ruta por variable de entorno) para UN firebaseUid de origen, y escribe en Postgres para UN usuario destino (por email), vía Prisma.
2. Mapeo:
   - projects → Cuenta (moneda ARS).
   - categories → Categoria GASTO (matchear por nombre con las existentes; crear las que falten); "Transferencias" no se migra como categoría.
   - incomes → Movimiento INGRESO.
   - expenses sin installments → Movimiento GASTO.
   - expenses con installments → agrupar por (description sin el sufijo de cuota, originalAmount, total, primera fecha) y crear una CompraTarjeta en una tarjeta "Tarjeta migrada" (diaCierre/diaVencimiento por parámetro) con sus cuotas; si no se puede agrupar con certeza, migrar como movimientos sueltos y listarlos en el reporte.
   - pares gasto/ingreso de transferencias → Transferencia (match por fecha + monto + descripción); los que no matchean quedan como movimientos y se reportan.
   - Montos: redondear a 2 decimales con decimal.js.
3. Modo --dry-run (default) que imprime un reporte: cantidades por tipo, totales por mes antes/después (tienen que coincidir), elementos no mapeados.
4. Modo --ejecutar en una sola transacción, idempotente (guardar el id original de Firestore en un mapa o en descripción técnica, y saltear lo ya migrado).
5. Probalo primero contra la rama dev de Neon. Mostrame el reporte del dry-run.
```

**Aceptación:** los totales mensuales de gastos e ingresos coinciden con los de la app vieja. Desde ahí, dejás de usar `gastos`.

---

## Fase 10 — Lanzamiento 1.5: test de perfil de inversor con IA

> Antes: definir con Flor el cuestionario base (preguntas, opciones, qué mide cada una) y los perfiles posibles con su descripción. Sin eso no se arranca.

### Paso 10.1 — Cuestionario y motor de reglas
**Rama:** `feat/10-perfil-base`

```
1. En packages/shared/src/perfil: cuestionario versionado (v1) como datos: preguntas con id, texto, tipo (opción única, escala, número), opciones con puntaje en dos ejes: capacidad financiera de asumir riesgo y disposición emocional (son distintas, el producto lo pide explícitamente). Contenido: el que defina Flor en docs/perfil-inversor-v1.md (si no existe, frená).
2. Motor de reglas determinístico: puntajes por eje → perfil sugerido (Conservador/Moderado/Agresivo, o los que defina Flor) + reglas de inconsistencia conocidas (ej. "no quiero perder nada" + "espero 30% anual en dólares"). Tests.
3. Esto funciona sin IA. La IA (paso 10.2) agrega interpretación y repreguntas, pero el resultado base nunca depende solo del modelo.
```

### Paso 10.2 — Capa de IA
**Rama:** `feat/10-perfil-ia`

```
1. modules/ai: AiService con interfaz propia (generarEstructurado<T>(prompt, schemaZod, opciones)) y un adaptador para el proveedor elegido (ARCHITECTURE §11 #8). API key por env. Timeouts, reintentos, registro de tokens/costo por llamada, límite de usos por usuario por día.
2. modules/perfil-inversor:
   - POST /perfil-inversor/iniciar → cuestionario.
   - POST /perfil-inversor/responder → con las respuestas, corre el motor de reglas y le pide a la IA (salida estructurada validada con zod): inconsistencias detectadas, hasta 3 preguntas adicionales.
   - POST /perfil-inversor/repreguntas → respuestas a las adicionales → informe final: perfil sugerido, nivel de riesgo, capacidad vs disposición, explicación en lenguaje simple, disclaimer.
   - Guardar PerfilInversor con versionCuestionario, versionPrompt, modelo, respuestas, conversación y resultado.
   - Prompts en archivos versionados (apps/api/src/modules/perfil-inversor/prompts/v1/*.md). El prompt prohíbe recomendar instrumentos concretos.
   - Si la IA falla, devolver el resultado del motor de reglas con explicación estándar.
3. Web: flujo paso a paso tipo conversación, informe final compartible (imagen/PDF simple), historial de tests.
4. Admin: listado de tests realizados (sin datos personales salvo email), para que Flor revise la calidad de las explicaciones.
5. Tests con el proveedor mockeado y un set de casos de inconsistencia.
```

---

## Fase 11 — Migrar el admin de Firestore a la API (asesoramiento)

### Paso 11.1 — Modelos y API de asesoramiento
**Rama:** `feat/11-asesoramiento-api`

```
1. Agregá al schema los modelos de docs/ARCHITECTURE.md §5.3 y generá la migración.
2. modules/asesoramiento (todo @Roles('ADMIN')): CRUD de clientes (con baja lógica: deshabilitar/habilitar, nunca borrar), brokers (no se borra si tiene clientes; renombrar no necesita batch porque ahora es relacional), planes, servicios, suscripción por cliente con historial de montos. Replicá exactamente las reglas de negocio de apps/admin/CLAUDE.md y de apps/admin/src/lib/{suscripciones,clientes,brokers}.ts. Mové esa lógica pura a packages/shared/src/asesoramiento con sus tests.
3. Endpoint para vincular un cliente de asesoramiento con un Usuario de la plataforma (usuarioId) y ponerle plan ASESORAMIENTO.
```

### Paso 11.2 — Script de migración Firestore → Postgres
**Rama:** `feat/11-migracion-admin`

```
Script scripts/migracion-admin: lee las colecciones clients, brokers, planes, servicios de Firestore (proyecto efecapitaladmin) y escribe en Postgres.
CRÍTICO: Faktia asocia receptores por referenciaExterna = id del doc de Firestore del cliente, y "broker:<id>" para brokers. Guardá esos valores en faktiaReferencia y que el admin los siga usando al facturar. Si esto se rompe, Faktia crea receptores duplicados.
Normalizá brokers desde el array brokers[] (y del string legacy broker si falta). Dry-run con reporte, después ejecución idempotente.
```

### Paso 11.3 — Admin contra la API
**Rama:** `feat/11-admin-api`

```
En apps/admin reemplazá src/stores/dataStore.ts (Firestore) por llamadas a la API con TanStack Query, pantalla por pantalla: clientes, brokers, planes, servicios, facturación mensual, dashboard. La integración con Faktia no cambia salvo que referenciaExterna sale de cliente.faktiaReferencia.
Al final: eliminar firebase/firestore del admin (queda solo firebase/auth), eliminar el campo legacy broker string y actualizar apps/admin/CLAUDE.md.
Probar facturación mensual completa en local contra Faktia de homologación antes de mergear.
```

---

## Después del Lanzamiento 1 (se planifica en detalle en su momento)

| Etapa | Pasos principales |
|---|---|
| **Insights (Etapa 2)** | Modelos de contenido; editor en el admin (Markdown o editor de bloques); categorías; nivel de acceso por feature; resumen semanal; informes públicos con SSR (Astro/Next) para SEO; notificación por email al publicar. |
| **Suscripciones** | Mercado Pago preapproval; webhooks idempotentes que actualizan `Suscripcion` y `Usuario.plan`; pantalla de planes y upgrade en la web; factura automática con Faktia por cada cobro; gestión en el admin. |
| **Inversiones (Etapa 3)** | Carteras modelo versionadas editables por Flor; base de ON (emisores, flujos, calificaciones); ingesta de precios; cálculo de TIR, duration y paridad en `shared` con tests contra casos de referencia; curva de rendimientos; clasificación verde/amarillo/rojo con criterio documentado; "Mi cartera de ON"; alertas por email y push; educación contextual. |
| **Acciones (Etapa 4)** | Proveedor de datos fundamentales; fichas; ratios históricos; comparación sectorial; TradingView según licencia; precios objetivo de terceros separados. |
| **IA (Etapa 5)** | Asistente con tool use sobre endpoints propios; RAG sobre informes y educación (pgvector); límites de uso por plan; distinción explícita entre hechos, estimaciones y escenarios; revisión humana de muestras. |
| **Asesoramiento** | Mensajes y documentos entre Flor y clientes dentro de la web; diagnóstico de cartera; seguimiento. |

---

## Checklist de lanzamiento (EFE Base)

- [ ] Fases 1–9 completas y en `PROGRESS.md`
- [ ] Decisiones 1–7 de `ARCHITECTURE.md` §11 tomadas
- [ ] Términos y política de privacidad reales (no placeholder)
- [ ] Neon en plan con restauración a un punto en el tiempo; restauración probada una vez
- [ ] Sentry recibiendo errores de las 3 apps
- [ ] Jobs corriendo (ver historial de GitHub Actions)
- [ ] Smoke test de producción verde
- [ ] 5–10 usuarios beta (amigos/clientes de Flor) usándolo 2 semanas antes de anunciar
- [ ] Métricas del admin funcionando para medir uso recurrente (el objetivo del Lanzamiento 1)
