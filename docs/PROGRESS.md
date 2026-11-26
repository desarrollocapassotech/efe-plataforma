# Progreso

Bitácora de los pasos de `docs/PLAN.md`. Al terminar un paso: marcarlo, y anotar debajo lo que quedó pendiente o se decidió distinto.

## Fase 0 — Preparación (manual)

- [ ] 0.1 Seguridad del repo `gastos` (sacar keystores)
- [ ] 0.2 GitHub (repo `desarrollocapassotech/efe-plataforma`, archivar `efecapital-portal-customer`)
- [x] 0.3 Neon (`efe-plataforma` producción + `efe-plataforma-desarrollo` con `develop` y `test`)
- [ ] 0.4 Firebase `efecapitaladmin` (Auth, service account, web app "EFE Web", sitios de Hosting)
- [ ] 0.5 Otros (Render, Sentry, Docker Desktop)
- [ ] 0.6 Con Flor: wireframes y decisiones 1–3 de `ARCHITECTURE.md` §11

## Fase 1 — Base del monorepo

- [x] 1.1 Scaffold del monorepo
- [x] 1.2 `packages/shared`: dinero, fechas y features
- [x] 1.3 Scaffold de la API
- [x] 1.4 Schema Prisma del Lanzamiento 1 + seed
- [x] 1.5 Autenticación, roles y features
- [x] 1.6 Scaffold de la web
- [x] 1.7 Mover el admin al monorepo

## Fase 2 — Finanzas personales (Módulo 1)

- [x] 2.1 Cuentas y categorías (API)
- [x] 2.2 Movimientos y transferencias (API)
- [x] 2.3 Recurrencias + job
- [x] 2.4 Resumen mensual y evolución (API)
- [x] 2.5 Web: onboarding, cuentas y categorías
- [x] 2.6 Web: movimientos y carga rápida
- [x] 2.7 Web: dashboard

## Fase 3 — Tarjetas de crédito (Módulo 2)

- [x] 3.1 Cálculos de tarjeta en `shared`
- [x] 3.2 Tarjetas, compras y pagos (API)
- [x] 3.3 Web: tarjetas

## Fase 4 — Objetivos financieros (Módulo 3)

- [x] 4.1 Objetivos (shared + API + web)

## Fase 5 — Indicadores económicos (Módulo 4)

- [ ] 5.1 Fuentes e ingesta
- [ ] 5.2 Web: panel de indicadores

## Fase 6 — Admin: módulos de la plataforma

- [ ] 6.1 Usuarios, métricas, auditoría e indicadores en el admin

## Fase 7 — Seguridad, privacidad y cumplimiento

- [ ] 7.1 Auditoría, límites y datos del usuario

## Fase 8 — Deploy a producción

- [ ] 8.1 CI
- [ ] 8.2 API en Render
- [ ] 8.3 Web y admin en Firebase Hosting
- [ ] 8.4 Smoke test de producción

## Fase 9 — Migrar datos de `gastos`

- [ ] 9.1 Script de migración

## Fase 10 — Lanzamiento 1.5: test de perfil de inversor con IA

- [ ] 10.1 Cuestionario y motor de reglas
- [ ] 10.2 Capa de IA

## Fase 11 — Migrar el admin de Firestore a la API

- [ ] 11.1 Modelos y API de asesoramiento
- [ ] 11.2 Script de migración Firestore → Postgres
- [ ] 11.3 Admin contra la API

---

## Notas por paso

### 1.1 Scaffold del monorepo

- pnpm 10 fijado en `packageManager` (usar vía Corepack: `corepack enable` o `corepack pnpm ...`).
- TypeScript `~5.9`: typescript-eslint 8 todavía no soporta TS ≥ 6.1 y Nest 11 / ts-jest van más probados con 5.x.
- ESLint 10 (la 9 ya está fuera de soporte); config flat con `defineConfig`. Turbo necesita `pnpm` en el PATH: correr `corepack enable pnpm` una vez por máquina.
- `packages/config` exporta: `@efe/config/tsconfig/{base,node,react}.json`, `@efe/config/eslint`, `@efe/config/eslint/react` y `@efe/config/tailwind` (preset vacío, se completa en 1.6).
- `tsconfig/node.json` usa `NodeNext`; la API (1.3) va a necesitar su propio override (CommonJS + decoradores para Nest).
- Prettier no formatea `*.md` (los docs se escriben a mano).
- Se trabaja directo en `main` (sin ramas por paso ni PRs), por pedido de Elías.

### 1.2 `packages/shared`

- Build con tsup en **ESM + CJS** (el plan decía solo ESM): la API Nest compila a CommonJS y Jest no carga ESM sin configuración extra. Subpaths: `@efe/shared`, `/dinero`, `/fechas`, `/features`, `/schemas`.
- **Sin `date-fns`**: las fechas se manejan como strings con aritmética de enteros y `Date.UTC`, que no depende de la zona del proceso. Una dependencia menos. Si más adelante hace falta algo complejo, se evalúa.
- Extras en `fechas`: `esFechaValida`, `esPeriodoValido`, `diasEnPeriodo`, `sumarDias`, `compararFechas` y `hoy(zona = 'America/Argentina/Buenos_Aires')` (para jobs y para "no generar movimientos futuros" en 2.3). Años válidos desde 1900.
- `formatearMoneda` es manual (no usa `Intl`) para dar el mismo resultado en Node y en cualquier navegador. Usa espacio no separable (U+00A0) entre símbolo y número, igual que Intl es-AR. Opciones: `decimales: 0 | 2`, `signo`.
- `dividirEnCuotas` exige un total string no negativo con hasta 2 decimales; redondeo general half up.
- `MontoSchema`: positivo (> 0), hasta 16 dígitos enteros y 2 decimales (entra en `Decimal(18, 2)`). Rechaza números: los montos viajan como string.
- zod 4 (compatible con `nestjs-zod` 5).
- Tests en Vitest con `TZ=America/Sao_Paulo` para detectar dependencias de la zona horaria.
- `pnpm-workspace.yaml` permite el script de instalación de `esbuild` (pnpm 10 los bloquea por defecto). Prisma se va a sumar en 1.3.

### 0.3 Neon

- Como en Vialto: producción y desarrollo en **proyectos separados** (la cuota de cómputo es por proyecto). Detalle en `ARCHITECTURE.md` §10.
  - `efe-plataforma` (`plain-shadow-50025502`): solo rama `production`, compute limitado a 2 CU. Sus connection strings son para Render (paso 8.2); no están en ningún archivo del repo ni de la máquina.
  - `efe-plataforma-desarrollo` (`rapid-recipe-19586937`): rama `develop` (en `apps/api/.env`) y rama `test` (en `apps/api/.env.test`), máx. 1 CU. Creado vía Neon MCP.
- No se usó `neon init` / `neon deploy`: escriben `neon.ts` y un `.env.local` en la raíz, y la arquitectura define Prisma con `DATABASE_URL`/`DIRECT_URL` en `apps/api/.env`.

### 1.3 Scaffold de la API

- NestJS **11** (ya salió la 12, pero `nestjs-zod` 5 solo soporta hasta 11 y la arquitectura dice 11). Prisma 6.19.
- Dependencias y para qué:
  - `@nestjs/{common,core,platform-express}`: framework. `@nestjs/swagger`: docs en `/api/docs` (solo fuera de producción). `@nestjs/throttler`: rate limit (100/min por IP).
  - `prisma` (en `dependencies`, porque Render corre `prisma migrate deploy` en el pre-deploy) + `@prisma/client`.
  - `nestjs-zod` + `zod`: validación global con los schemas de `@efe/shared`.
  - `nestjs-pino` + `pino` + `pino-http`: logs JSON con redacción de `Authorization`, cookies y `X-Jobs-Secret`. `pino-pretty` (dev) para leerlos en consola.
  - `helmet`: headers de seguridad.
  - Dev: `@nestjs/cli`, `@nestjs/testing`, `jest` + `ts-jest` (default de Nest), `supertest`.
- **Sin `@nestjs/config` ni `dotenv`**: el `.env` se carga con `process.loadEnvFile` (nativo de Node 22) y se valida con zod (`src/config/env.ts`). `ConfigService` propio y tipado. Si falta algo, la API no arranca y lista qué falta, sin mostrar valores.
- Firebase y `JOBS_SECRET` son opcionales hasta 1.5 / 2.3, pero **obligatorias si `NODE_ENV=production`**.
- `Decimal` → string con un interceptor global: siempre al menos 2 decimales (`"1234.50"`), pero conserva la precisión de columnas con más decimales (indicadores, `Decimal(18, 6)`).
- Errores: filtro global → `{ error: { code, message, details? } }`. Validación zod → 400 `VALIDACION` con los issues; P2002 → 409 `CONFLICTO`; P2025 → 404 `NO_ENCONTRADO`; 429 `DEMASIADAS_SOLICITUDES`; lo desconocido → 500 `ERROR_INTERNO` sin filtrar el mensaje interno.
- `GET /api/v1/health` responde 503 si la base no responde (Render lo usa como health check). Marcarlo `@Public()` en 1.5.
- `configurarApp()` es compartida entre `main.ts` y los e2e, para que los e2e prueben la misma configuración HTTP que producción.
- `prisma generate` es una tarea de Turbo propia (`prisma:generate`) de la que dependen build, typecheck, test y dev: en Windows, dos `generate` en paralelo chocan con la DLL del motor bloqueada.
- e2e (`pnpm --filter @efe/api test:e2e`) contra la rama `test` de Neon vía `.env.test`. `docker-compose.yml` queda como alternativa (Postgres 18, puerto 5433).
- Tsconfig de la API: `NodeNext` (CommonJS + respeta `exports` de `@efe/shared`), decoradores, `isolatedModules: false`. ESLint de la API desactiva `consistent-type-imports`: un `import type` de una clase inyectada rompe la DI de Nest.
- Ojo en esta máquina: la extensión **Console Ninja** de VS Code modifica `@nestjs/core` en `node_modules` y hace que Jest avise "A worker process has failed to exit gracefully". No es del código (no pasa en CI ni con una instalación limpia).

### 1.4 Schema Prisma + seed

- Schema de §5.2 copiado tal cual: `prisma validate` sin errores, no hizo falta corregir nada. Migración `20261126150730_init` aplicada en `develop` (y en `test` por el global setup de los e2e): 17 tablas + `_prisma_migrations`.
- Para revisar en 5.1: `indicadores` tiene `@@unique([codigo, fecha])` y además `@@index([codigo, fecha(sort: Desc)])`. El índice único ya sirve para leer en orden descendente, así que el segundo sobra (más costo de escritura). Se puede sacar con una migración cuando se implemente el módulo.
- Plantilla de categorías en `apps/api/src/modules/categorias/plantilla.ts` (13 de gasto, 5 de ingreso). Paleta: azul marino y dorado de EFE + colores categóricos; dentro de cada tipo no se repite color. `categoriasDefaultPara(usuarioId)` la reusa el guard de 1.5.
- Seed (`pnpm --filter @efe/api prisma db seed`): corre con Node 22 directo (type stripping), sin `tsx`/`ts-node`. Admins por `SEED_ADMIN_FIREBASE_UID` y `SEED_ADMIN_EMAIL` (coma separada, emparejados por posición). Idempotente: si el usuario existe lo actualiza a ADMIN; si no, lo crea con sus categorías default (igual que un registro normal). Corrido dos veces en `develop`: 1 usuario, 18 categorías.
- Admin cargado en `develop`: Elías (UID y email en `apps/api/.env`, no en el repo). Falta el de Flor.
- Prisma avisa que `package.json#prisma` (donde está el comando del seed) se depreca en Prisma 7. Se queda así hasta migrar a Prisma 7 (ARCHITECTURE §2).
- e2e: `test/global-setup.ts` corre `prisma migrate deploy` contra la base de tests antes de empezar. `.env.test` ahora **pisa** las variables del entorno (antes `loadEnvFile` no lo hacía, y un `DATABASE_URL` exportado en la shell podía mandar los e2e a otra base).

### 1.5 Autenticación, roles y features

- `firebase-admin` 14 (verificación de ID tokens, ARCHITECTURE §4). Depende de `jose` (solo ESM): Node 22 lo carga, Jest no. Por eso `VerificadorFirebase` vive en su propio archivo y se carga con `import()` dinámico solo fuera de tests.
- Guards globales en orden: throttler → `FirebaseAuthGuard` → `RolesGuard` → `FeatureGuard`. Todo es privado salvo `@Public()` (por ahora solo `/health`).
- Códigos de error: `NO_AUTENTICADO` (sin token), `TOKEN_INVALIDO` (token malo o vencido), `TOKEN_SIN_EMAIL` (usuario nuevo sin email en Firebase), `CUENTA_ELIMINADA` (403), `PROHIBIDO` (rol), `FEATURE_NO_INCLUIDA` (403, con `details.feature`).
- Usuario nuevo: se crea en una transacción con sus 18 categorías default. Si dos requests del mismo usuario nuevo llegan juntos, el segundo choca con el unique de `firebaseUid` (P2002) y lee el que creó el primero.
- `ultimoAccesoEn` se actualiza como máximo una vez por hora. Decisión agregada: si el email del token cambió en Firebase, se sincroniza en `Usuario.email`.
- Tokens de prueba `test:<uid>:<email>`: solo con `NODE_ENV=test`. `main.ts` se niega a arrancar con `NODE_ENV=test`, así que un servidor real nunca los acepta (verificado: el server real responde 401 a un token de prueba).
- Firebase ahora es obligatorio en el entorno salvo en tests.
- `GET /me` → usuario + `features` del plan. `PATCH /me` → `nombre`, `monedaPrincipal`, `onboardingCompletado` (`ActualizarMeSchema` en `@efe/shared/schemas`, estricto: rechaza `rol`, `plan` o cualquier otro campo). `MeSchema` también en shared para el front.
- Verificado con un ID token real: custom token del UID de Elías con la service account, canjeado en la REST API de Firebase (`signInWithCustomToken`) y usado contra la API compilada (conectada a `develop`).
- Tests: unit del guard, la sesión y los guards de permisos (11); e2e de auth y `/me` (9), con un controller de prueba definido solo en el test para `@Roles` y `@RequiresFeature`. Los usuarios de los e2e usan UIDs únicos por corrida y se borran al final.
- Admins en `develop`: Elías y Flor (seed).

### 1.6 Scaffold de la web

- Stack: Vite 8, React 18.3 (lo que pide la arquitectura), React Router 7 (`react-router-dom`), TanStack Query 5, Firebase 13, Tailwind 3.4 + shadcn/ui (componentes escritos a mano en `src/components/ui`: button, input, label, card, sonner), react-hook-form + zod 4, `vite-plugin-pwa` 2. Tests con Vitest + Testing Library + jsdom.
- Dependencias nuevas y para qué: `firebase` (auth cliente), `@tanstack/react-query` (estado del servidor), `react-router-dom` (rutas), `react-hook-form` + `@hookform/resolvers` (formularios con los schemas zod), `@radix-ui/react-slot`/`react-label` + `class-variance-authority` + `clsx` + `tailwind-merge` (base de shadcn/ui), `lucide-react` (íconos, como el admin), `sonner` (toasts), `tailwindcss-animate` (animaciones de shadcn, en el preset).
- **Preset de Tailwind** (`packages/config/tailwind`): además de colores, fuentes y radius, define las variables CSS de los tokens (claro y `.dark`), `.brand-bar` y `.eyebrow` con un plugin. Así web y admin comparten los valores y cada app pone solo su `--radius` (web: `0.625rem`; admin seguirá con 2px). En 1.7 el admin tiene que sacar esas variables de su `index.css` y usar el preset.
- **Firebase**: por ahora usa la Web app del admin (`.env.local`, no versionado). Pendiente del paso 0.4: registrar "EFE Web" y cambiar `VITE_FIREBASE_APP_ID`.
- Login con Google: popup en desktop, redirect en móvil (como pide el plan). Ojo: el redirect necesita que el `authDomain` sea del mismo sitio que la app en navegadores que bloquean cookies de terceros (Safari, Chrome nuevo). En producción hay que resolverlo con el dominio de auth propio (pendiente cosmético de ARCHITECTURE §2) o pasando a popup también en móvil.
- Al registrarse se manda el email de verificación de Firebase (no bloquea el uso).
- `apiClient` (`src/lib/api-client.ts`): agrega el ID token, convierte `{ error: { code, message } }` en `ApiError`, reintenta una vez con el token refrescado si la API responde 401, y da `SIN_CONEXION` si no hay red. Tests unitarios.
- QueryClient: `staleTime` 30 s, sin reintentos en 4xx, mutaciones sin reintentos. El cache se vacía en el logout y cuando cambia el usuario de Firebase.
- Rutas: públicas `/login`, `/registro`, `/recuperar` (si hay sesión, redirigen a la app); privadas bajo `RequiereSesion`, que carga `/me` (crea el usuario la primera vez) y manda a `/onboarding` si no está completo. Cuenta eliminada → pantalla propia (la restauración llega en 7.1). Error de API → pantalla con Reintentar y Cerrar sesión.
- `/onboarding` es provisorio: un botón "Empezar" marca `onboardingCompletado` para poder entrar. El onboarding real es el paso 2.5.
- Layout: móvil con barra superior azul (logo blanco + barra dorada) y navegación inferior fija (Inicio, Movimientos, Tarjetas, Objetivos, Más), con safe areas de iOS; desktop con sidebar azul y el ítem activo marcado en dorado, como el admin. "Más" tiene la cuenta, el plan y Cerrar sesión.
- PWA: manifest "EFE Capital" con los colores de marca, íconos generados desde `logo-mark.png` (192, 512, maskable con margen, apple-touch, favicon) sin dependencias extra, service worker `autoUpdate` que precachea solo el shell (nunca respuestas de la API). Firebase y React van en chunks propios.
- Para instalar la PWA en el celular hace falta HTTPS (o localhost): con `vite --host` por IP de la red el navegador no ofrece instalar. Probarlo con un túnel HTTPS o después del deploy (8.3).
- Falta probar a mano: registro con email y con Google en el navegador (necesita Email/contraseña y Google habilitados en Firebase Auth, paso 0.4).

### 1.7 Mover el admin al monorepo

- Copiado de `efecapital-portal-admin` a `apps/admin` sin `.git`, `node_modules`, `dist`, `.firebase`, `bun.lockb`, `package-lock.json` ni `.env` (sí `.env.example`). Paquete `@efe/admin`, puerto 5174, sin `lovable-tagger`.
- Versiones unificadas con la web: React Router 7, Firebase 13, TanStack Query 5, lucide-react 1.x, sonner 2, Vite 8 + `@vitejs/plugin-react` (en vez de `plugin-react-swc`), TypeScript 5.9, ESLint 10. Compila sin errores de tipos.
- Usa `@efe/config`: tsconfig de React, ESLint de React y el preset de Tailwind. Los tokens salieron de su `index.css` (quedan en el preset); el admin conserva `--radius: 0.125rem` y en su `tailwind.config.ts` resuelve `xl`/`2xl`/`3xl` a ese radius, así la UI queda igual.
- Concesiones al código heredado (Lovable): TypeScript **sin modo estricto** (overrides en su `tsconfig.json`) y las reglas nuevas de `react-hooks` 7 (React Compiler: `set-state-in-effect`, `immutability`, `static-components`, `purity`) en *warning* (20 avisos, sobre todo `ClientForm` y `Billing`). Se corrigen al reescribir esas pantallas contra la API en la Fase 11.
- **No se borró nada** (decisión de Elías): Mensajes, Informes, notificaciones push, `mockData.ts`, componentes de shadcn sin uso y archivos de Lovable (`README.md`, `App.css`, `placeholder.svg`) quedan como estaban. Mensajes e Informes siguen ocultos detrás del switch "En desarrollo". ARCHITECTURE §3.3 actualizado.
- `firebase.json` y `.firebaserc` quedaron en `apps/admin`, pero el deploy sigue saliendo del repo viejo hasta la Fase 8 (ahí va un `firebase.json` multi-sitio en la raíz).
- `apps/admin/CLAUDE.md`: comandos del monorepo, sección "Migración en curso", rutas a Faktia (`../../../../FAKTIA`) y a los logos (`../../../Imagenes`) actualizadas, tokens en el preset.
- Para correrlo hace falta `apps/admin/.env` con `VITE_FAKTIA_API_URL` y `VITE_FAKTIA_APP_URL` (copiarlo del repo viejo). Falta la prueba manual de login, clientes, facturas y facturación mensual contra Firestore y Faktia.
- Arreglos de pasos anteriores: la web pasó a `tailwind-merge` 2.x (la 3 es para Tailwind 4) y el test del guard de la API dejó de depender de la hora.

### 2.1 Cuentas y categorías (API)

- Schemas en `@efe/shared/schemas` (`cuentas.ts`, `categorias.ts`) y nuevos en `base.ts`: `ImporteSchema` (con signo, para saldos iniciales), `ColorSchema` (`#RRGGBB`, se guarda en mayúsculas), `BooleanoQuerySchema` (`z.stringbool()`, para `?incluirArchivadas=true`), `IdSchema`. Todos estrictos: rechazan campos desconocidos (incluido `usuarioId`).
- Cuentas: `GET /cuentas?incluirArchivadas`, `POST`, `PATCH /:id`, `DELETE /:id`. Con `@RequiresFeature('finanzas')`.
  - `saldoActual` se calcula con un `$queryRaw` (subconsultas agrupadas por cuenta) y nunca trae filas: saldo inicial + ingresos − gastos + transferencias entrantes (`montoDestino`) − salientes (`montoOrigen`) − pagos de resumen. Las cuotas no afectan saldos.
  - Para revisar: el saldo incluye movimientos con fecha futura si el usuario los carga. Si se prefiere "saldo a hoy", es un filtro `fecha <= hoy` en la consulta.
  - `DELETE` con movimientos, transferencias (origen o destino), recurrencias o pagos → 409 `CUENTA_CON_MOVIMIENTOS`. Cambiar la moneda con operaciones → 409 `CUENTA_MONEDA_BLOQUEADA` (mandar la misma moneda no cuenta como cambio).
  - Orden nuevo = máximo + 1. Archivar es `PATCH { archivada: true }`.
- Categorías: `GET /categorias?tipo&incluirArchivadas`, `POST`, `PATCH /:id`, `DELETE /:id`, `PUT /categorias/orden`.
  - Nombre único por usuario y tipo **sin distinguir mayúsculas** ("Café" = "café"), con chequeo previo y el unique de la base como respaldo ante carreras → 409 `CATEGORIA_DUPLICADA`.
  - El tipo no se puede cambiar (rompería movimientos ya cargados).
  - `DELETE` en uso (movimientos, recurrencias o compras) → 409 `CATEGORIA_EN_USO`.
  - `PUT /orden`: si alguna categoría no es del usuario → 404 y no se toca nada.
- Recurso de otro usuario o inexistente → 404 `NO_ENCONTRADO` (helpers `noEncontrado` / `conflicto` en `common/errors/errores.ts`).
- Agregado `GET /categorias?incluirArchivadas` (el plan solo pedía `?tipo`) para que la pantalla de gestión pueda mostrar y desarchivar.
- e2e: `test/helpers.ts` (levantar la app, crear usuarios de prueba, borrarlos). Cuentas (7 tests) y categorías (8 tests): CRUD, validaciones, aislamiento entre dos usuarios, saldo con todos los tipos de operación (insertados con Prisma: movimientos, transferencias ARS→USD, pago de resumen y una compra en cuotas que no debe contar).

### 2.2 Movimientos y transferencias (API)

- Movimientos: `GET /movimientos` (filtros `desde`, `hasta`, `tipo`, `cuentaId`, `categoriaId`, `q` en la descripción sin distinguir mayúsculas; paginación por cursor), `POST`, `PATCH /:id`, `DELETE /:id`. Cada item trae `cuenta` y `categoria` resumidas.
  - La moneda no se manda: es la de la cuenta.
  - Categoría de otro tipo → 422 `CATEGORIA_TIPO_INVALIDO`. Agregado: categoría archivada → 422 `CATEGORIA_ARCHIVADA`; cuenta archivada → 422 `CUENTA_ARCHIVADA` (solo al crear o al mover a otra cuenta: editar un movimiento viejo de una cuenta archivada sí se puede).
  - `PATCH` no deja cambiar el tipo. Cambiar a una cuenta de otra moneda → 422 `CUENTA_MONEDA_DISTINTA`.
  - **Editar un movimiento generado por una recurrencia lo desvincula** (`recurrenciaId` y `periodoRecurrencia` a null), así el job de 2.3 no lo regenera ni pisa la edición.
- Transferencias: `GET /transferencias` (filtros `desde`, `hasta`, `cuentaId` como origen o destino; paginado), `POST`, `PATCH /:id`, `DELETE /:id`.
  - Misma moneda: sin `montoDestino` llega lo mismo que sale; si viene distinto → 422 `MONTO_DESTINO_INVALIDO`. Monedas distintas: `montoDestino` obligatorio → 422 `MONTO_DESTINO_REQUERIDO`.
  - La respuesta trae `cotizacion` implícita (pesos por dólar, en cualquier sentido) calculada con `cotizacionImplicita` de `@efe/shared/dinero` (con tests). null si las monedas son iguales.
  - `PATCH` revalida el resultado completo: si sigue siendo entre monedas distintas y no se manda `montoDestino`, conserva el anterior; si pasa a misma moneda, el destino vuelve a igualar al origen. Origen = destino → 422 `CUENTAS_IGUALES` (al crear es 400 de validación).
- Paginación por cursor (`common/pagination/cursor.ts`): keyset sobre `fecha desc, creadoEn desc, id desc`. El cursor guarda esos tres valores (base64url), así sigue funcionando aunque se borre el último item de la página. Cursor inválido → 400 `CURSOR_INVALIDO`. Respuesta `{ items, nextCursor }` (`paginaSchema` en shared).
- `common/fechas.ts`: conversión `YYYY-MM-DD` ↔ `@db.Date` en UTC.
- `exigirCuentaActiva` vive en el módulo de cuentas y lo usan movimientos y transferencias.
- e2e: movimientos (11 tests: 120 movimientos recorridos en páginas de 50/50/20 sin repetir ni saltear y en orden, cursor con item borrado, cada filtro y combinados, validaciones, recurrencia desvinculada, aislamiento) y transferencias (6 tests: ARS→USD con cotización y saldos, reglas de monto de destino, PATCH con cambio de moneda, aislamiento, paginación y filtro por cuenta).
- Arreglo de infraestructura: ESLint ignora los temporales que crean tsup/vite al cargar su config (`*.bundled_*.mjs`); con lint y build en paralelo hacían fallar el lint de forma intermitente.

### 2.3 Recurrencias + job

- Cálculo en `@efe/shared/recurrencias` (subpath nuevo): `ocurrenciasRecurrencia(regla, limite, despuesDePeriodo)` y `proximaOcurrencia(regla, desdeFecha, despuesDePeriodo)`, con `fechaConDia` para el clamp (31 → último día). 16 tests: meses cortos, bisiestos, desde a mitad de mes, hasta, cruce de año, anual (incluido 29/2) y último generado.
- **Cambio de schema**: `Recurrencia.ultimoPeriodoGenerado String?` (migración `recurrencia_ultimo_periodo`, aplicada en `develop` y `test`). Motivo: deducir "lo último generado" de los movimientos falla si el usuario borra uno o lo edita (se desvincula, regla de 2.2): el job lo volvería a crear o lo duplicaría. La columna solo avanza. ARCHITECTURE §5.1 y §5.2 actualizados.
- CRUD `/recurrencias` (`?incluirInactivas`), con las mismas validaciones que movimientos (cuenta activa y propia, categoría del mismo tipo y no archivada, moneda de la cuenta). La respuesta trae `proximaFecha`.
  - Al crear se genera en el momento lo que corresponde hasta hoy.
  - `PATCH` valida la regla resultante (anual con mes, `hasta >= desde`) → 422 `RECURRENCIA_INVALIDA`; volver a mensual limpia el mes. Los cambios rigen hacia adelante.
  - **Reactivar no recupera los meses en que estuvo inactiva**: lo que habría tocado hasta ayer se da por procesado. Decisión para no cargar de golpe meses atrasados; revisar con Flor si se prefiere lo contrario.
  - Borrar la recurrencia deja los movimientos generados (`recurrenciaId` → null).
- Job: `POST /internal/jobs/:job` (`@Public`, sin throttle), protegido por `X-Jobs-Secret` comparado en tiempo constante (sha256 + `timingSafeEqual`). Sin `JOBS_SECRET` configurado rechaza todo. Job desconocido → 404 `JOB_DESCONOCIDO`. Job `recurrencias`: `materializarTodas(hoy)` (hoy en Argentina), una transacción por recurrencia, `createMany` con `skipDuplicates`; si una falla se loguea y sigue. Respuesta `{ job, duracionMs, recurrencias, generados, errores }`; loguea inicio, fin y duración.
- La regla "categoría válida para el tipo" pasó al módulo de categorías (`exigirCategoriaValida`), la usan movimientos y recurrencias.
- `apps/api/.env` local tiene un `JOBS_SECRET` aleatorio para probar el job (`curl -X POST -H "X-Jobs-Secret: ..." localhost:3000/api/v1/internal/jobs/recurrencias`).
- Tests: unit del guard del secreto (3) y e2e (10): generación al crear sin fechas futuras, validaciones, 401 sin secreto o con token de usuario, idempotencia (job dos veces), borrar/editar un generado no lo recrea, desactivar y reactivar sin recuperar atrasados, anual, borrar la recurrencia conserva los movimientos, PATCH, aislamiento.
- El cron que llama al job es el paso 8.3 (`jobs.yml`).

### 2.4 Resumen mensual y evolución (API)

- `GET /resumen/mensual?periodo=YYYY-MM` (sin período: mes actual en Argentina) → `{ periodo, monedas: [...] }`, una entrada por moneda con datos en el mes (ARS primero), sin mezclar monedas. Cada una: `ingresos`, `gastos` (= `gastosMovimientos` + `gastosTarjeta`), `saldo`, `porcentajeGastado` (null sin ingresos), `porCategoria` (solo gastos, de mayor a menor; las cuotas suman a la categoría de su compra; "Sin categoría" con `categoriaId`, `color` e `icono` en null) y `comparacionMesAnterior` (`ingresosAnterior`, `gastosAnterior`, `variacionIngresos`, `variacionGastos`; variación null si el anterior fue cero). El plan pedía `comparacionMesAnterior: { ingresos, gastos }`: se agregaron los valores absolutos del mes anterior para que el dashboard pueda mostrarlos.
- `GET /resumen/evolucion?meses=12&hasta=YYYY-MM` (1 a 36 meses, default 12 hasta el mes actual) → por moneda, todos los meses del rango (en cero si no hubo datos) con `ingresos`, `gastos`, `gastosMovimientos`, `gastosTarjeta`, `saldo`.
- Criterio caja (ARCHITECTURE §5.1, **sigue pendiente de validar con Flor**, decisión #1 de §11): gastos del mes = movimientos GASTO con fecha en el mes + cuotas con `periodoResumen` = mes. Transferencias y pagos de resumen no cuentan.
- Agregados en SQL: `groupBy` de Prisma (movimientos por moneda × tipo y moneda × categoría, cuotas por moneda) y `$queryRaw` con `GROUP BY` (cuotas × categoría de la compra, serie de evolución por mes). En memoria solo se combinan grupos ya sumados.
- **Índices**: no hizo falta agregar ninguno. Las consultas filtran por `usuarioId` + rango de `fecha` (índice `movimientos(usuarioId, fecha)`), por `usuarioId` + `categoriaId` + `fecha` (`movimientos(usuarioId, categoriaId, fecha)`) y por `usuarioId` + `periodoResumen` (`cuotas(usuarioId, periodoResumen)`); el join de cuotas con compras va por la PK de `compras_tarjeta`.
- `porcentaje(parte, total)` y `variacionPorcentual(actual, anterior)` en `@efe/shared/dinero`, con tests.
- e2e (7 tests) con un set armado a mano y resultados exactos: dos monedas, cuotas del período y de otros períodos, movimientos en los bordes del mes (30/11, 31/10, 01/12), una transferencia y un pago de resumen que no deben contar, datos de otro usuario, mes sin datos, evolución con meses en cero.

### 2.5 Web: onboarding, cuentas y categorías

- **Sin wireframes (paso 0.6 sin hacer)**. Guía de Elías: basarse en la app `gastos` pero mucho más simple, **apta para todo público, muy intuitiva, lo más limpia posible y sin tantas opciones**, con los colores del admin de EFE (tokens del preset, azul marino + dorado). Aplicado así:
  - Acción principal grande y a mano del pulgar; lo secundario (archivar, eliminar, ordenar) escondido en el panel de edición o detrás de un botón.
  - Lenguaje cotidiano ("¿Dónde tenés tu plata?", "¿Cuánta plata tenías al empezar?"), sin jerga.
  - Defaults en vez de preguntas: tipo Efectivo, moneda principal, si no elige cuentas se crea "Efectivo".
  - Crear y editar en un **panel** que en el celular es una hoja desde abajo y en desktop un diálogo (Radix Dialog).
  - Las cuentas no tienen selector de color (el ícono del tipo alcanza); las categorías sí (paleta cerrada).
- **Onboarding** (`/onboarding`), 3 pasos con barra de progreso dorada: (1) nombre + moneda principal con dos botones grandes; (2) "¿Dónde tenés tu plata?" con opciones tocables (Efectivo, Banco, Mercado Pago y la otra moneda) — "Saltear" crea Efectivo; si ya tiene cuentas (recargó a mitad), no crea nada; (3) listo → `onboardingCompletado`.
- **Cuentas** (`/mas/cuentas`): totales por moneda arriba (tarjeta azul), lista con ícono del tipo, nombre, tipo · moneda y saldo actual (rojo si es negativo). Tocar abre el panel de edición (nombre, tipo con íconos, moneda, saldo inicial con `MoneyInput` que admite negativos). Archivar/restaurar/eliminar al pie del panel con confirmación; si la API responde `CUENTA_CON_MOVIMIENTOS`, se ofrece archivar. Archivadas colapsadas al final.
- **Categorías** (`/mas/categorias`): pestañas Gastos/Ingresos, grilla con emoji sobre círculo de su color, mosaico "Nueva". Modo **Ordenar** con flechas subir/bajar y "Listo" (`PUT /categorias/orden`) — **sin dnd-kit** (una dependencia menos, y las flechas funcionan igual en móvil y desktop). Panel con vista previa, nombre, emoji y color; `CATEGORIA_EN_USO` ofrece archivar; `CATEGORIA_DUPLICADA` muestra el error en el formulario.
- **"Más"**: lista de accesos (Cuentas, Categorías) con descripción corta + tu cuenta + Cerrar sesión. `Pagina` admite flecha de volver y acción a la derecha.
- Componentes compartidos: `MoneyInput` (teclado numérico, formato es-AR mientras se escribe, coma decimal y punto final tomado como coma, devuelve el decimal para la API; lógica en `lib/montos.ts` con tests), `CurrencyAmount`, `ColorPicker` (paleta), `EmojiPicker` (54 emojis frecuentes, sin librería), `Panel`, `Confirmacion`, estados `Cargando`/`ErrorCarga`/`Vacio`.
- `PALETA_CATEGORIAS` pasó a `@efe/shared/categorias` (subpath nuevo): la usan la plantilla de la API y el selector de color de la web. El seed sigue andando (importa `@efe/shared` ya compilado).
- Dependencias nuevas (web): `@radix-ui/react-dialog` (panel) y `@radix-ui/react-alert-dialog` (confirmaciones): las de shadcn, accesibles (foco, Escape, lector de pantalla).
- TanStack Query: `['cuentas']` y `['categorias']` traen todo (incluidas archivadas) y la pantalla separa; cada mutación invalida su clave.
- Tests nuevos: `lib/montos` (7) y `MoneyInput` (3). Total web: 27.
- Falta probar a mano en el navegador y en el celular (no hay herramienta de navegador en esta sesión).

### 2.6 Web: movimientos y carga rápida

- **Carga rápida**: botón flotante "+" en toda la zona privada (arriba de la barra inferior en móvil, abajo a la derecha en desktop). Abre un único panel (`CargaRapidaProvider` + `useCargaRapida()`, cualquier pantalla puede abrirlo) con: Gasto/Ingreso, `MoneyInput` grande y enfocado, categorías como grilla de emojis en el orden del usuario (Categorías → Ordenar = "las más usadas primero"), cuenta (la última usada, recordada en `localStorage` con `efe:ultimaCuenta`; el selector solo aparece si hay más de una cuenta), fecha con atajos Hoy / Ayer / Otro día, nota opcional y "Se repite todos los meses". **Guardar** queda fijo al pie del panel (`PieFijo`): tocar "+", escribir el monto y Guardar (la categoría es opcional).
  - **Alta optimista**: el movimiento aparece en las listas cacheadas que coinciden con sus filtros apenas se toca Guardar (atenuado hasta que responde la API) y el panel se cierra; si la API falla, se saca y se avisa con un toast. Después se invalidan movimientos, transferencias, cuentas, resumen y recurrencias.
  - "Se repite todos los meses" (gasto o ingreso; el plan lo pedía para ingresos, se habilitó para los dos porque alquiler y servicios son el caso típico) crea una **recurrencia** mensual con el día de la fecha elegida; la API genera en el momento el movimiento de este mes. Descripción por defecto: la nota, o el nombre de la categoría.
  - Opciones secundarias del mismo botón: **"Pasar plata entre tus cuentas"** (link al pie del panel, cambia el panel a transferencia). "Con tarjeta" se suma en la Fase 3.
- **Transferencias**: origen y destino como chips; si las monedas difieren se pide cuánto llegó y se muestra "Te quedó un dólar a $ X" (`cotizacionImplicita` de shared). También desde Cuentas ("Pasar plata entre cuentas", si hay 2 o más).
- **Movimientos** (`/movimientos`): navegador de mes (`components/MesNavigator`), lista agrupada por día ("Hoy", "Ayer", "Lunes 23 de noviembre") con el neto del día por moneda (las transferencias no cuentan), scroll infinito con el cursor de la API (IntersectionObserver + botón "Ver más" de respaldo). Tocar un item abre el mismo panel en modo edición, con Eliminar al pie.
  - **Filtros en un panel** (botón "Filtrar" con contador): búsqueda en notas, Todo / Gastos / Ingresos / Entre cuentas, cuenta y categoría. Los filtros activos se ven como chips que se quitan con un toque. **Los filtros y el mes viven en la URL** (`?mes=2026-11&categoria=…`): el dashboard (2.7) puede linkear a la lista filtrada (`linkMovimientos`).
  - Transferencias en la lista: se piden todas las del mes (son pocas; se recorren las páginas de a 100) y se mezclan por fecha con los movimientos. Con scroll infinito, las transferencias más viejas que el último movimiento cargado se muestran recién cuando llega esa página (`agruparPorDia`, con tests). Se ocultan si se filtra por categoría o texto.
  - Editar un movimiento generado por una recurrencia muestra el aviso de que los meses siguientes se siguen cargando (la API lo desvincula, regla de 2.2).
- **Recurrentes** (Más → Recurrentes, `/mas/recurrentes`): agrupados en Gastos fijos / Ingresos fijos / Pausados, con "Cada mes, el día 10" y la próxima fecha. Panel de alta/edición (nombre, monto, cada mes o una vez por año, día y mes, categoría, cuenta), **Pausar/Reanudar** y Eliminar al pie. Las altas desde acá arrancan hoy (`desde` = hoy). Reactivar no recupera meses atrasados (decisión abierta de 2.3, sin cambios).
- Helpers nuevos: `lib/fechas-ui.ts` (nombres de mes y día en español, sin `Intl`, con tests) y `lib/preferencias.ts` (localStorage con try/catch: en modo privado se usan los defaults).
- Sin dependencias nuevas.
- Tests nuevos (web): `fechas-ui` (4), `agruparPorDia` (3), formulario de carga rápida (5: defaults y última cuenta, validación, cambio de tipo, alta que crea recurrencia). Total web: 39.
- Revisado en Chromium a 360 px con una API simulada (arnés local, no versionado): lista, carga, transferencia entre monedas, filtros, edición, recurrentes y el alta optimista. Falta probar a mano contra la API real y en el celular.

### 2.7 Web: dashboard

- Hecho con la skill de dataviz (forma primero, color al final y validado con su script).
- **Inicio** (`/`), de arriba hacia abajo, legible en 360 px:
  1. Navegador de mes y, solo si el mes tiene datos en las dos monedas, Pesos / Dólares (**sin convertir**, decisión #2 de §11 sigue abierta). La moneda elegida se deriva: la elegida si tiene datos, si no la principal, si no la primera.
  2. **Tarjeta principal** (azul): "Te queda este mes" como cifra protagonista (saldo del mes, sin centavos), "Entró" y "Gastaste" (con "$ X con tarjeta" si hay cuotas) y un medidor "Gastaste el 82 % de lo que entró" (dorado hasta 80 %, `warning` de 80 a 100 %, `destructive` + ícono de alerta arriba de 100 %). **Distinto al plan**: las 4 tarjetas que pedía (ingresos, gastos, saldo, % gastado) quedaron en una sola tarjeta con jerarquía, por la guía de "pocas tarjetas, claras".
  3. **¿En qué se fue la plata?**: barras horizontales ordenadas (en vez de donut: las barras se comparan mejor, anti-patrón de la skill), cada una con el color de su categoría, monto y %; las 5 primeras + "Otras N" (`resumirCategorias`, con tests). Tocar una fila abre Movimientos filtrado por ese mes y categoría (con `linkMovimientos` de 2.6).
  4. **Comparado con el mes anterior**: "Subió 13 %" / "Bajó…" con flecha + color semántico (gastos que suben = `destructive`, ingresos que suben = `success`) y el valor del mes anterior.
  5. **Últimos 12 meses**: barras agrupadas Entró vs Gastaste, un solo eje, ticks compactos ("$ 1,1 M", "$ 350 mil"), tooltip con los montos exactos, leyenda siempre visible, "Ver los números" (tabla) para lectores de pantalla y para quien no quiera el gráfico. Tocar un mes del gráfico lo elige arriba. Termina siempre en el mes actual.
  6. Accesos "Tarjetas" y "Objetivos" con "Muy pronto" (placeholders hasta las fases 3 y 4).
- **Tokens nuevos en el preset**: `--chart-ingresos` (azul) y `--chart-gastos` (dorado), clases `bg-chart-ingresos`/`bg-chart-gastos`. El azul marino de `--primary` no sirve como serie (muy oscuro, casi gris para el validador): se usaron el azul y el dorado de EFE con más brillo, validados con `validate_palette.js` en claro (sobre blanco) y oscuro (sobre la tarjeta oscura): bandas de luminosidad, croma, separación con daltonismo (ΔE ≥ 27) y contraste ≥ 3:1.
- **Recharts 3** (dependencia nueva en la web, permitida por el plan): la librería de gráficos más usada en React, declarativa, con SVG accesible y tooltips; la usaba `gastos`. Se carga **lazy** (chunk propio de ~118 kB gzip) para que no pese en la carga inicial ni en las otras pantallas. Recharts pinta con atributos SVG (no lee `var()`), así que los colores se leen de los tokens con `getComputedStyle`.
- Plata: los montos se pasan a `number` **solo para la geometría** (alto de barras, ancho del medidor); todo lo que se muestra sale del string con `formatearMoneda`/`montoCompacto` (`lib/formato.ts`, con tests).
- Al cambiar de mes, el resumen anterior queda atenuado hasta que llega el nuevo (`keepPreviousData`), sin saltos.
- Tests nuevos (web): `formato` (2), `resumirCategorias` (2). Total web: 43.
- Revisado en Chromium a 360 px con la API simulada (tarjeta, categorías, comparación, gráfico con tooltip). Falta probar con datos reales y en el celular.

### 3.1 Cálculos de tarjeta en `shared`

- **Tests primero**: la tabla de casos se commiteó sola (`test(shared): casos de período de resumen…`) contra un esqueleto que tiraba "No implementado", y después la implementación. Ese primer commit quedó con un error de tipos en el test (un parámetro de menos en un `it.each`), corregido en el commit de la implementación.
- `@efe/shared/tarjetas` (subpath nuevo): `calcularResumen(fechaCompra, tarjeta, overrides)`, `generarCuotas(compra, tarjeta, overrides)`, `resumenDelPeriodo(periodo, tarjeta, overrides)` (fechas de un período, para el detalle del resumen y la API) y `proximoResumen(hoy, tarjeta, overrides)` (el primero que vence hoy o después: "sin período → el próximo a vencer" de 3.2).
- **Distinto al plan en los overrides**: el plan decía "si hay override cuyo fechaCierre cae en ese mes, usarlo". Se aplicó **por período** (un override reemplaza al resumen calculado de su mismo `periodo`), que es la clave única de `CierreTarjeta` en el schema (`tarjetaId + periodo`). Con la regla por mes de cierre, un override que adelanta el cierre de diciembre al 28/11 taparía el cierre normal de noviembre. ARCHITECTURE §5.1 actualizado.
- La cuota *n* va en `periodo de la cuota 1 + (n − 1)`: con días normales cada período tiene exactamente un resumen.
- Caso límite documentado en el código: si cierre y vencimiento están a 1–2 días al final del mes (ej. 28 y 29), el clamp de febrero puede hacer que dos cierres venzan el mismo mes. No pasa con tarjetas reales (el vencimiento es ~10 días después del cierre); `resumenDelPeriodo` tiene un fallback para que siempre devuelva algo.
- Valida días 1..31 enteros, fechas `YYYY-MM-DD` reales y cantidad de cuotas entera ≥ 1 (la de `dividirEnCuotas`).
- Tests (33): mismo día del cierre / día siguiente, cruce de año, vencimiento el mismo mes o el siguiente, vencimiento igual al cierre, cierre 31 en febrero (común y bisiesto) y en meses de 30, overrides que adelantan, atrasan y de otro período, `resumenDelPeriodo`, `proximoResumen` (incluido "vence hoy"), 1/3/18 cuotas con suma exacta, centavos (0,05 en 3), cuotas con override, entradas inválidas. Total shared: 131.

### 3.2 Tarjetas, compras y pagos (API)

- Módulo `tarjetas` con tres controllers (todos con `@RequiresFeature('tarjetas')`): `TarjetasController` (`/tarjetas`), `ComprasController` (`/tarjetas/compras`) y `PagosController` (`/tarjetas/pagos`). Schemas en `@efe/shared/schemas/tarjetas.ts` (con tests).
- **Tarjetas**: `GET` (`?incluirArchivadas`), `POST`, `PATCH /:id`, `DELETE /:id`. Días 1..31, `ultimos4` de exactamente 4 números, color `#RRGGBB`. Cada tarjeta viene con su **`proximoResumen`** (período y fechas del primero que vence hoy o después) y sus `saldos` por moneda (`total`, `pagado`, `pendiente`): lo que necesita el listado de 3.3. `DELETE` con compras o pagos → 409 `TARJETA_CON_COMPRAS` (archivar). Tarjeta archivada → 422 `TARJETA_ARCHIVADA` al cargarle compras (pagar un resumen de una archivada sí se puede).
- **Overrides**: `PUT /tarjetas/:id/cierres/:periodo` `{ fechaCierre, fechaVencimiento }` (el vencimiento tiene que ser posterior al cierre y caer en el mes del período → 422 `CIERRE_INVALIDO`). **Agregado**: `DELETE /tarjetas/:id/cierres/:periodo` para volver a las fechas calculadas (la pantalla de 3.3 permite deshacer una corrección).
- **Recálculo** (`recalcularPeriodos`, en la misma transacción): al guardar/borrar un override se recalculan las cuotas con período ≥ ese período; al cambiar `diaCierre`/`diaVencimiento`, desde **el próximo resumen a pagar con el calendario anterior** (los resúmenes ya vencidos no se tocan). Usa `generarCuotas` de shared y solo actualiza las cuotas que cambian.
- **Compras**: `GET` (paginado por cursor, `?tarjetaId&desde&hasta`), `POST`, `PATCH /:id` (regenera todas las cuotas), `DELETE /:id` (cuotas en cascada). Categoría solo de gastos y no archivada. Moneda ARS o USD por compra (una tarjeta puede tener las dos). Hasta 72 cuotas.
- **`GET /tarjetas/resumen?tarjetaId&periodo`** → **una lista** con un resumen por tarjeta (todas las activas si no se pasa `tarjetaId`; sin `periodo`, el próximo a vencer **de cada tarjeta**, que puede ser distinto entre tarjetas): fechas, `fechasManuales`, cuotas (descripción, n/total, categoría), `saldos` por moneda y pagos.
- **`GET /tarjetas/compromisos?meses=12`** → desde el mes actual, cada período con `totales` por moneda y `porTarjeta`. Suma las cuotas (no descuenta pagos parciales del período en curso: es "lo comprometido", el detalle de lo pagado está en el resumen).
- **Pagos**: `GET` (`?tarjetaId&periodo`), `POST`, `DELETE /:id`. La cuenta tiene que ser propia, activa y de la moneda del pago (422 `CUENTA_MONEDA_DISTINTA`). Verificado en el e2e: el pago descuenta del saldo de la cuenta y `/resumen/mensual` cuenta las cuotas pero no el pago.
- Agregados en SQL: saldos y compromisos con `groupBy` (cuotas por tarjeta × período × moneda, pagos igual). El detalle del resumen sí trae las cuotas (se muestran una por una).
- e2e `tarjetas.e2e-spec.ts` (10 tests): validaciones, compra en 3 cuotas en 3 resúmenes, cambio de cierre que mueve cuotas y vuelve, override que mueve cuotas y al borrarlo vuelven, edición de compra que regenera cuotas, paginación, pagos (moneda, saldo de cuenta, resumen mensual, borrar), próximo a vencer, compromisos, archivar/borrar, **aislamiento** entre dos usuarios. Suite completa contra Postgres 16 local: 71 tests verdes.
- Sin migraciones: los modelos ya estaban en el schema.

### 3.3 Web: tarjetas

- **Tarjetas** (`/tarjetas`): una tarjeta grande por cada una con su color, "A pagar el sábado 5 de diciembre", lo que falta pagar del próximo resumen por moneda ("$ 412.350 + US$ 25") y una barra del ciclo con "Cierra en 6 días" o "Ya cerró: lo que compres ahora va al resumen siguiente. Vence en 9 días". Botón "Comprometido" arriba, "Agregar tarjeta" abajo, archivadas colapsadas.
- **Alta/edición** (panel): nombre, marca (chips), día de cierre y de vencimiento con una explicación corta, últimos 4 opcionales, color (paleta cerrada). Archivar/eliminar al pie; `TARJETA_CON_COMPRAS` ofrece archivar.
- **Compra con tarjeta**: desde el "+" → "Fue con tarjeta de crédito" (opción secundaria, solo en modo Gasto). Tarjeta (la última usada), monto grande con Pesos/Dólares, cuotas en chips 1 pago/3/6/12/18 + "Otra", "Puse el total / Puse cada cuota" (si es por cuota calcula el total con `multiplicar`), **vista previa** "La primera cuota en el resumen que vence el 5 de enero y la última en marzo 2027 ($ 45.000 por mes)" con `generarCuotas`/`resumenDelPeriodo` de shared en el front, categoría, fecha y "¿Qué compraste?" (si queda vacío se usa el nombre de la categoría: la API lo exige). La vista previa **no conoce las fechas corregidas a mano** (la API no las expone en el listado); la API sí las usa al guardar.
- **Detalle del resumen** (`/tarjetas/:id?periodo=`): navegador de período (sin `?periodo`, el próximo a vencer), tarjeta azul con vencimiento, cierre y "Te falta pagar" por moneda (o "Pagado"), "¿El banco cambió las fechas? Corregilas" (panel con las dos fechas → `PUT cierres`, y "Volver a las fechas de siempre" → `DELETE`), botón **Registrar pago** por moneda pendiente (panel: monto = lo que falta, cuenta de esa moneda, fecha), compras del resumen ("Cuota 2 de 12", tocar → editar o eliminar la compra en el mismo panel del "+") y pagos (con eliminar). Para editar desde el resumen se agregó `montoTotal` a cada cuota de `GET /tarjetas/resumen`.
- **Comprometido** (`/tarjetas/comprometido`): barras apiladas por tarjeta de los próximos 12 meses (color de cada tarjeta, leyenda, tooltip con montos exactos, un solo eje), detalle del mes elegido con link al resumen de cada tarjeta y la lista "Mes por mes". Moneda a elegir si hay compras en las dos. Gráfico lazy (reusa el chunk de Recharts).
- **Inicio**: el placeholder de tarjetas pasó a "Próximo resumen" (el que vence primero con saldo pendiente en la moneda elegida) y "Comprometido en los próximos 3 meses". Sin tarjetas, un acceso "¿Usás tarjeta de crédito?".
- Los colores de las tarjetas son del usuario (dato que identifica a cada una), de la misma paleta cerrada que las categorías; no pasan por el validador de dataviz (no son una paleta categórica del sistema), por eso el gráfico siempre tiene leyenda y la lista con los números.
- Tests nuevos (web): vista previa de cuotas (3). Total web: 46.
- Revisado en Chromium a 360 px con la API simulada (listado, resumen con pagos, comprometido, compra con vista previa). Falta probar contra la API real y en el celular.

### 4.1 Objetivos (shared + API + web)

- **`@efe/shared/objetivos`** (subpath nuevo): `calcularAvance` → `acumulado`, `porcentaje` (0 a 100 con tope), `faltante` (≥ 0), `mesesRestantes`, `aporteMensualSugerido`, `ritmoMensual`, `fechaEstimada`, `enCamino`. Más `mesesHasta`, `resumirAportes` e `inicioRitmo`. 10 tests (en camino / atrasado, planeado vs promedio, sin aportes, cumplido, fecha pasada, retiros que dejan el acumulado negativo, centavos).
  - **Distinto al plan en la firma**: el plan pedía `calcularAvance({ ..., aportes, ... })`. Recibe `acumulado` y `aportadoUltimosMeses` ya sumados, así la API los calcula con **agregados en SQL** (regla del repo) en vez de traer todos los aportes. `resumirAportes(aportes, hoy)` arma esos dos valores desde una lista (front/tests).
  - Definiciones que el plan no fijaba (documentadas en ARCHITECTURE §5.1): meses restantes = meses calendario entre el mes actual y el de la fecha objetivo, mínimo 1 si no pasó (0 si pasó; el sugerido es entonces todo lo que falta); ritmo = planeado o lo aportado en el mes actual y los 2 anteriores / 3; fecha estimada = hoy + ⌈faltante / ritmo⌉ meses (mismo día, con clamp); "en camino" sin fecha objetivo = está aportando (ritmo > 0).
- **API** (`@RequiresFeature('objetivos')`): `GET /objetivos` (activos primero, cada uno con `avance`), `GET /objetivos/:id` (agregado: con el historial de aportes), `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/aportes` (monto con signo; negativo = retiro; cero → 400), `DELETE /:id/aportes/:aporteId`. `estado: 'CUMPLIDO'` solo con el 100 % → 422 `OBJETIVO_INCOMPLETO` (no es automático). Cambiar la moneda con aportes → 409 `OBJETIVO_MONEDA_BLOQUEADA`. Archivado no recibe aportes → 422 `OBJETIVO_ARCHIVADO`. Avance con dos `groupBy` (total y últimos meses) por objetivo.
- e2e `objetivos.e2e-spec.ts` (6 tests): validaciones, aportes y retiros contra el cálculo de shared, cumplido solo al 100 %, borrar aporte, moneda bloqueada, archivado, **aislamiento**. Suite completa: 77 verdes.
- **Web**:
  - `/objetivos`: tarjeta por objetivo con ícono, "% · $ juntado de $ meta", barra dorada, "Aportá $ X por mes hasta mayo 2027" o "A este ritmo llegás en julio 2027" y estado en palabras con ícono ("En camino", "Atrasado", "Sin aportes recientes", "Cumplido"). Cumplidos y archivados colapsados.
  - Alta: primero "¿Para qué querés ahorrar?" con plantillas (Fondo de emergencia 🛟, Viaje ✈️, Auto 🚗, Vivienda 🏠, Proyecto 🚀, Patrimonio 📈, Otro 🎯), después nombre, monto con Pesos/Dólares, fecha opcional y aporte mensual opcional. **Fondo de emergencia**: explicación + "Gastás en promedio $ X por mes" (promedio de los meses cerrados con gastos de los últimos 6, de `/resumen/evolucion`) y botones "3 meses: $ …" / "6 meses: $ …" que completan el monto.
  - `/objetivos/:id`: tarjeta azul con lo juntado, %, meta y fecha; "¿Cómo venís?" en lenguaje simple (te faltan, cuánto aportar por mes, cuándo llegás a este ritmo); **Aportar** (panel: Pongo plata / Saco plata, monto con el sugerido por defecto, fecha, nota) e historial con eliminar. Editar, marcar cumplido (al 100 %), archivar y eliminar desde el lápiz.
  - Los aportes **no mueven plata de las cuentas** (son seguimiento, como en el schema): se aclara en el panel.
  - Inicio: bloque con hasta 3 objetivos activos (o un acceso "¿Para qué querés ahorrar?").
- Tests nuevos (web): promedio de gastos y fondo sugerido (2). Total web: 48.
- Revisado en Chromium a 360 px con la API simulada. Falta probar contra la API real y en el celular.
