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
- [ ] 1.4 Schema Prisma del Lanzamiento 1 + seed
- [ ] 1.5 Autenticación, roles y features
- [ ] 1.6 Scaffold de la web
- [ ] 1.7 Mover el admin al monorepo

## Fase 2 — Finanzas personales (Módulo 1)

- [ ] 2.1 Cuentas y categorías (API)
- [ ] 2.2 Movimientos y transferencias (API)
- [ ] 2.3 Recurrencias + job
- [ ] 2.4 Resumen mensual y evolución (API)
- [ ] 2.5 Web: onboarding, cuentas y categorías
- [ ] 2.6 Web: movimientos y carga rápida
- [ ] 2.7 Web: dashboard

## Fase 3 — Tarjetas de crédito (Módulo 2)

- [ ] 3.1 Cálculos de tarjeta en `shared`
- [ ] 3.2 Tarjetas, compras y pagos (API)
- [ ] 3.3 Web: tarjetas

## Fase 4 — Objetivos financieros (Módulo 3)

- [ ] 4.1 Objetivos (shared + API + web)

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
