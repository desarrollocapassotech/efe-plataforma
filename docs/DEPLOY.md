# Deploy a producción (Fase 8)

Lo que está en el repo y lo que hay que hacer a mano. **Nada se despliega solo** hasta completar los pasos manuales: Render no conoce el repo hasta que se conecta el Blueprint, y los workflows de deploy y de jobs no hacen nada mientras la variable `DEPLOY_HABILITADO` del repo no sea `true`.

## API en Render (`render.yaml`)

En el repo: el Blueprint con el web service `efe-api` (plan Starter, región Virginia, la más cercana a Neon São Paulo), build con Turbo, `prisma migrate deploy` como pre-deploy, health check `/api/v1/health` y auto-deploy desde `main`.

A mano, en el dashboard de Render:

1. New → Blueprint → elegir `desarrollocapassotech/efe-plataforma` (rama `main`).
2. Cargar las variables marcadas `sync: false`:
   - `DATABASE_URL` y `DIRECT_URL`: connection strings pooled y directa del proyecto Neon **`efe-plataforma`**, rama **`production`** (nunca las de desarrollo).
   - `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`: de la service account de `efecapitaladmin` (la clave con sus `\n`, la API los convierte).
   - `CORS_ORIGINS`: `https://app.<dominio>,https://admin.<dominio>` (y los `*.web.app` mientras no haya dominio).
   - `JOBS_SECRET`: largo y aleatorio (`openssl rand -hex 32`). El mismo valor va al secret `API_JOBS_SECRET` de GitHub.
   - `SENTRY_DSN`: el del proyecto `efe-api` (opcional).
3. Primer deploy. Verificar `https://<servicio>.onrender.com/api/v1/health` → `db: "ok"`.
4. Seed de admins (Elías y Flor), desde una máquina con `DATABASE_URL` de producción en el entorno (sin guardarlo en archivos): `SEED_ADMIN_FIREBASE_UID=… SEED_ADMIN_EMAIL=… pnpm --filter @efe/api exec prisma db seed`.
5. Carga inicial de indicadores: `curl -X POST -H "X-Jobs-Secret: …" https://<api>/api/v1/internal/jobs/indicadores-historico`.
6. Dominio `api.<dominio>` en Render (Custom Domains).

## Web y admin en Firebase Hosting

Ver la sección del paso 8.3 en `docs/PROGRESS.md` (archivos `firebase.json`, `.firebaserc` y workflows).

## CI

`.github/workflows/ci.yml` corre en cada PR y push a `main`: archivos prohibidos, formato, lint, typecheck, tests, build, migraciones al día (`prisma migrate diff --exit-code`) y e2e contra un Postgres 18 del runner.
