# Progreso

Bitácora de los pasos de `docs/PLAN.md`. Al terminar un paso: marcarlo, y anotar debajo lo que quedó pendiente o se decidió distinto.

## Fase 0 — Preparación (manual)

- [ ] 0.1 Seguridad del repo `gastos` (sacar keystores)
- [ ] 0.2 GitHub (repo `desarrollocapassotech/efe-plataforma`, archivar `efecapital-portal-customer`)
- [ ] 0.3 Neon (proyecto `efe-plataforma`, ramas `main`, `dev`, `test`)
- [ ] 0.4 Firebase `efecapitaladmin` (Auth, service account, web app "EFE Web", sitios de Hosting)
- [ ] 0.5 Otros (Render, Sentry, Docker Desktop)
- [ ] 0.6 Con Flor: wireframes y decisiones 1–3 de `ARCHITECTURE.md` §11

## Fase 1 — Base del monorepo

- [x] 1.1 Scaffold del monorepo
- [ ] 1.2 `packages/shared`: dinero, fechas y features
- [ ] 1.3 Scaffold de la API
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
