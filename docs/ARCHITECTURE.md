# EFE Capital — Plataforma de inteligencia financiera personal

Documento de arquitectura. Fuente de verdad para decisiones técnicas. Si una decisión cambia, se actualiza acá en el mismo PR.

- Producto: ver `Plataforma.pdf` (visión, etapas, módulos, modelo freemium).
- Plan de implementación paso a paso: `docs/PLAN.md`.
- Socios: Elías (tecnología) y Flor (EFE Capital: contenido, asesoramiento, marca).

---

## 1. Principios

1. **Diseñar para el producto completo, construir solo el lanzamiento actual.** Los módulos de etapas futuras tienen lugar previsto (carpetas, enums, permisos), pero no se implementan antes de tiempo.
2. **Monolito modular.** Una API, una base, módulos con límites claros. Nada de microservicios.
3. **Una sola lógica de cálculo.** Todo cálculo financiero (períodos de resumen, cuotas, objetivos, TIR más adelante) vive en `packages/shared` y lo usan API y front.
4. **Plata exacta.** `Decimal` en la base, `string` en JSON, `decimal.js` en código. Nunca `number` para montos. Siempre con moneda.
5. **Permisos por plan desde el día 1.** Cada funcionalidad tiene una *feature* y se habilita por plan.
6. **Datos externos con trazabilidad.** Todo dato de mercado se guarda con fuente, fecha del dato y fecha de obtención.
7. **Costo bajo hasta que haya tracción.** Free tiers donde no afecte la experiencia ni la seguridad de los datos.

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo, Node 22 LTS, TypeScript `strict` |
| API | NestJS 11, Prisma 6 (igual que Vialto; Prisma 7 ya salió y mueve las URLs de conexión a `prisma.config.ts`: no migrar hasta que haga falta), PostgreSQL (Neon), `nestjs-zod` (validación + Swagger), pino (logs) |
| Auth | Firebase Authentication (email/contraseña + Google). La API valida el ID token con `firebase-admin` |
| Web (usuarios) | React 18 + Vite + Tailwind + shadcn/ui + TanStack Query + React Router + `vite-plugin-pwa` |
| Admin | El `efecapital-portal-admin` actual, movido a `apps/admin` |
| Validación compartida | zod (schemas en `packages/shared`) |
| Tests | Jest (API, default de Nest) + Vitest (shared, web, admin) |
| Hosting | Render (API), Firebase Hosting multi-sitio (web + admin), Neon (DB) |
| Observabilidad | Sentry (API, web, admin) |
| Facturación | Faktia (ya integrado en el admin) |
| Pagos (Etapa 3) | Mercado Pago, suscripciones (preapproval) + webhooks |
| IA (L1.5 y Etapa 5) | API de modelo detrás de un `AiService` propio (proveedor intercambiable) |

### Firebase

Se **reutiliza el proyecto `efecapitaladmin`** para Auth y Hosting:
- El admin ya autentica ahí y Faktia ya acepta tokens de ese proyecto (federación). Usar otro proyecto obliga a reconfigurar Faktia.
- Hosting multi-sitio: un sitio para `web` y otro para `admin`.
- Firestore deja de usarse para datos de negocio. Queda permitido solo para tiempo real (chat/notificaciones) si en el futuro hace falta.
- Pendiente cosmético: dominio de auth propio para que el popup de Google no muestre `efecapitaladmin.firebaseapp.com`.

El proyecto `mis-gastos-mes` (app personal de gastos) no se toca; solo se lee una vez para migrar los datos de Elías (Fase 9 del plan).

---

## 3. Estructura del monorepo

```
efe-plataforma/
├── CLAUDE.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PLAN.md
│   └── PROGRESS.md            # bitácora: qué paso del plan está hecho
├── apps/
│   ├── api/                   # NestJS
│   ├── web/                   # app de usuarios (PWA)
│   └── admin/                 # back-office (ex efecapital-portal-admin)
├── packages/
│   ├── shared/                # tipos, schemas zod, cálculos, features por plan
│   └── config/                # tsconfig base, eslint, prettier, preset de Tailwind con tokens EFE
├── scripts/
│   └── migracion-gastos/      # script único Firestore (mis-gastos-mes) → Postgres
├── .github/workflows/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 3.1 `apps/api`

```
src/
├── main.ts
├── app.module.ts
├── config/                # env validado con zod; falla al arrancar si falta algo
├── prisma/                # PrismaModule + PrismaService
├── common/
│   ├── auth/              # FirebaseAuthGuard, @CurrentUser, @Roles, @RequiresFeature, @Public
│   ├── filters/           # filtro global de errores → { error: { code, message, details } }
│   ├── interceptors/      # auditoría, logging
│   ├── pagination/        # paginación por cursor
│   └── money/             # serialización Decimal → string
├── modules/
│   ├── usuarios/          # /me, onboarding, borrado de cuenta, exportación
│   ├── cuentas/
│   ├── categorias/
│   ├── movimientos/
│   ├── transferencias/
│   ├── recurrencias/
│   ├── tarjetas/          # tarjetas, cierres, compras, cuotas, pagos de resumen
│   ├── objetivos/
│   ├── resumen/           # agregados: resumen mensual, evolución, distribución
│   ├── indicadores/       # proveedores externos + ingesta + consulta
│   ├── auditoria/
│   ├── admin/             # endpoints de back-office (rol ADMIN)
│   ├── jobs/              # endpoints internos disparados por cron
│   ├── perfil-inversor/   # L1.5
│   ├── asesoramiento/     # Fase 11: clientes, brokers, planes (migrado del admin)
│   ├── contenido/         # Etapa 2: informes, educación  (vacío hasta entonces)
│   ├── suscripciones/     # Etapa 3: Mercado Pago          (vacío hasta entonces)
│   └── inversiones/       # Etapa 3: carteras modelo, ON   (vacío hasta entonces)
└── test/                  # e2e
```

Cada módulo: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/` (creados desde los schemas zod de `shared` con `createZodDto`), `*.spec.ts`.

Reglas de la API:
- Todo endpoint es privado salvo los marcados `@Public()`.
- Toda consulta filtra por `usuarioId` del token. Nunca se recibe `usuarioId` por body/query (salvo endpoints admin).
- Las respuestas devuelven montos como `string` con 2 decimales.
- Fechas de negocio (fecha de un gasto) como `YYYY-MM-DD`; períodos como `YYYY-MM`; timestamps en ISO UTC.
- Errores con código estable (`CUENTA_CON_MOVIMIENTOS`, `FEATURE_NO_INCLUIDA`, etc.).

### 3.2 `apps/web`

```
src/
├── app/                   # router, providers (QueryClient, Auth), layout
├── features/
│   ├── auth/              # login, registro, recuperar contraseña
│   ├── onboarding/
│   ├── dashboard/
│   ├── movimientos/       # lista, carga rápida (botón "+"), transferencias
│   ├── recurrencias/      # Más → Recurrentes
│   ├── cuentas/
│   ├── categorias/
│   ├── tarjetas/          # listado, resumen, compra (desde el "+"), comprometido
│   ├── objetivos/
│   ├── indicadores/
│   └── perfil/            # datos de la cuenta, exportar, eliminar cuenta
├── components/ui/         # shadcn
├── components/            # compartidos (MoneyInput, MonthNavigator, CurrencyAmount…)
└── lib/                   # apiClient (agrega el ID token), firebase, formatters
```

Cada feature: `api.ts` (llamadas), `hooks.ts` (TanStack Query), `pages/`, `components/`.

UX: mobile-first, barra de navegación inferior en móvil, sidebar en desktop. Botón flotante de "cargar gasto" siempre visible (como en `gastos`). Tokens visuales de EFE (azul marino, dorado de acento) desde el preset de `packages/config`.

### 3.3 `apps/admin`

El portal admin actual, con su `CLAUDE.md` y design system. Convive en dos fases:
1. **Hasta la Fase 11:** sigue leyendo/escribiendo Firestore para clientes/brokers/planes/servicios y facturando con Faktia. Los módulos nuevos (usuarios de la plataforma, métricas, auditoría, indicadores) consumen la API.
2. **Fase 11:** clientes/brokers/planes/servicios pasan a Postgres y el admin deja de usar Firestore.

Mensajes e Informes (beta) **se conservan** en el admin, ocultos detrás del switch "En desarrollo" (`previewStore`), leyendo Firestore como hasta ahora. Decisión de Elías al hacer el paso 1.7 (nov 2026): no se borran. Se rehacen contra la API en el Lanzamiento Asesoramiento.

### 3.4 `packages/shared`

```
src/
├── dinero/          # Money helpers sobre decimal.js: sumar, restar, dividirEnCuotas, formatear
├── fechas/          # períodos YYYY-MM, clamp de días (31 → último día del mes), rangos
├── tarjetas/        # calcularPeriodoResumen, generarCuotas
├── objetivos/       # avance, aporte mensual sugerido, fecha estimada
├── features/        # FEATURES, FEATURES_POR_PLAN, tieneFeature()
├── schemas/         # zod: inputs y outputs de cada endpoint
└── index.ts
```

---

## 4. Auth, roles y permisos

### Flujo
1. El front autentica con Firebase (email/contraseña o Google) y obtiene el ID token.
2. Cada request a la API va con `Authorization: Bearer <idToken>`.
3. `FirebaseAuthGuard` verifica el token con `firebase-admin`, busca el `Usuario` por `firebaseUid` y, si no existe, lo crea (con categorías default). Actualiza `ultimoAccesoEn` como máximo una vez por hora.
4. El usuario queda en `req.user` y se obtiene con `@CurrentUser()`.

Recuperación de contraseña y verificación de email: las maneja Firebase.

### Roles
- `USUARIO`: cualquier persona registrada.
- `ADMIN`: Flor y Elías. Se asigna por seed/SQL, nunca desde la app.

El plan (free/premium/asesoramiento) **no es un rol**: es una propiedad del usuario derivada de su suscripción.

### Features por plan (en `packages/shared/src/features`)

```ts
export const FEATURES = [
  'finanzas', 'tarjetas', 'objetivos', 'indicadores', 'perfil_inversor', 'cartera_liquidez',
  'informes', 'informes_exclusivos', 'carteras_premium', 'analizador_on', 'mi_cartera_on',
  'alertas', 'acciones', 'asistente_ia', 'asesoramiento',
] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURES_POR_PLAN: Record<Plan, Feature[]> = {
  FREE: ['finanzas', 'tarjetas', 'objetivos', 'indicadores', 'perfil_inversor', 'cartera_liquidez', 'informes'],
  PREMIUM: [/* FREE + */ 'informes_exclusivos', 'carteras_premium', 'analizador_on', 'mi_cartera_on', 'alertas', 'acciones', 'asistente_ia'],
  ASESORAMIENTO: [/* PREMIUM + */ 'asesoramiento'],
};
```

- API: `@RequiresFeature('analizador_on')` → 403 `FEATURE_NO_INCLUIDA`.
- Front: `useFeature('analizador_on')` para mostrar, ocultar o mostrar un "upgrade".
- `GET /me` devuelve `plan` y `features`.

---

## 5. Modelo de datos

### 5.1 Decisiones de dominio

| Tema | Decisión |
|---|---|
| Monedas | `ARS` y `USD`. Cada cuenta tiene una moneda; todo movimiento hereda la de su cuenta. **No se mezclan monedas en un total**: el dashboard muestra totales por moneda. Conversión a ARS al MEP como vista opcional (posterior). |
| Cuentas | Reemplazan a los "projects/cuentas" de `gastos`. Tienen saldo inicial. |
| Categorías | Por usuario, sembradas al registrarse desde una plantilla. Separadas por tipo (gasto/ingreso). Se archivan, no se borran si tienen movimientos. |
| Ingresos recurrentes vs extraordinarios | Recurrente = generado por una `Recurrencia`. Extraordinario = ingreso cargado a mano. No hace falta un flag. |
| Recurrencias | Se materializan en `Movimiento` con un job diario idempotente (`@@unique([recurrenciaId, periodoRecurrencia])`). `Recurrencia.ultimoPeriodoGenerado` guarda el último período procesado y solo avanza: si el usuario borra o edita (desvincula) un movimiento generado, no se vuelve a crear. Solo se generan fechas <= hoy (Argentina). Al reactivar una recurrencia no se recuperan los períodos en que estuvo inactiva. Cálculo de fechas en `@efe/shared/recurrencias`. |
| Transferencias | Entidad propia, **no** cuentan como ingreso ni gasto. Permiten moneda distinta en origen y destino (compra de dólares). |
| Compras con tarjeta | `CompraTarjeta` + N `Cuota`. Cada cuota tiene su `periodoResumen`. |
| Período de resumen | `YYYY-MM` del **mes de vencimiento** del resumen (el mes en que se paga). |
| Cálculo del período | Se busca el primer cierre con fecha ≥ fecha de compra. Cada cierre calculado es `diaCierre` con clamp al último día del mes, y su vencimiento la próxima ocurrencia de `diaVencimiento` estrictamente posterior al cierre; el período es el mes de ese vencimiento. Un override (`CierreTarjeta`) **reemplaza al resumen de su mismo período** (clave `tarjetaId + periodo`), con sus dos fechas. La cuota *n* cae *n−1* períodos después. Cálculo en `@efe/shared/tarjetas`. |
| Montos de cuota | `montoTotal / cantidadCuotas` truncado a centavos; la última cuota absorbe la diferencia. |
| Gasto del mes (criterio caja) | Gastos del mes = movimientos de tipo GASTO con fecha en el mes **+** cuotas con `periodoResumen` = mes. A validar con Flor. |
| Pago de resumen | `PagoResumen` descuenta del saldo de la cuenta, pero **no** es gasto (ya se contaron las cuotas). |
| Cambio de cierre | Si cambia `diaCierre`/`diaVencimiento` o se carga un `CierreTarjeta`, se recalculan los `periodoResumen` de las cuotas con período ≥ al afectado. |
| Objetivos | Acumulado = suma de aportes. Aporte sugerido = (objetivo − acumulado) / meses restantes. |
| Borrado de cuenta | Soft delete (`eliminadoEn`) + borrado definitivo a los 30 días por job. También se borra el usuario de Firebase. |
| IDs | `cuid()`. |

### 5.2 Schema Prisma — Lanzamiento 1

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Rol {
  USUARIO
  ADMIN
}

enum Plan {
  FREE
  PREMIUM
  ASESORAMIENTO
}

enum Moneda {
  ARS
  USD
}

enum TipoCuenta {
  EFECTIVO
  BANCO
  BILLETERA
  INVERSION
  OTRA
}

enum TipoMovimiento {
  INGRESO
  GASTO
}

enum Frecuencia {
  MENSUAL
  ANUAL
}

enum RedTarjeta {
  VISA
  MASTERCARD
  AMEX
  CABAL
  NARANJA
  OTRA
}

enum EstadoObjetivo {
  ACTIVO
  CUMPLIDO
  ARCHIVADO
}

enum EstadoSuscripcion {
  PENDIENTE
  ACTIVA
  PAUSADA
  CANCELADA
  VENCIDA
}

enum ProveedorPago {
  MERCADOPAGO
  MANUAL
}

model Usuario {
  id                   String    @id @default(cuid())
  firebaseUid          String    @unique
  email                String
  nombre               String?
  rol                  Rol       @default(USUARIO)
  plan                 Plan      @default(FREE)
  monedaPrincipal      Moneda    @default(ARS)
  onboardingCompletado Boolean   @default(false)
  ultimoAccesoEn       DateTime?
  creadoEn             DateTime  @default(now())
  actualizadoEn        DateTime  @updatedAt
  eliminadoEn          DateTime?

  cuentas         Cuenta[]
  categorias      Categoria[]
  movimientos     Movimiento[]
  transferencias  Transferencia[]
  recurrencias    Recurrencia[]
  tarjetas        Tarjeta[]
  compras         CompraTarjeta[]
  cuotas          Cuota[]
  pagosResumen    PagoResumen[]
  objetivos       Objetivo[]
  perfiles        PerfilInversor[]
  suscripciones   Suscripcion[]

  @@index([email])
  @@map("usuarios")
}

model Cuenta {
  id            String     @id @default(cuid())
  usuarioId     String
  nombre        String
  tipo          TipoCuenta @default(OTRA)
  moneda        Moneda     @default(ARS)
  color         String?
  saldoInicial  Decimal    @default(0) @db.Decimal(18, 2)
  archivada     Boolean    @default(false)
  orden         Int        @default(0)
  creadoEn      DateTime   @default(now())
  actualizadoEn DateTime   @updatedAt

  usuario               Usuario         @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  movimientos           Movimiento[]
  transferenciasSalida  Transferencia[] @relation("TransferenciaOrigen")
  transferenciasEntrada Transferencia[] @relation("TransferenciaDestino")
  recurrencias          Recurrencia[]
  pagosResumen          PagoResumen[]

  @@index([usuarioId])
  @@map("cuentas")
}

model Categoria {
  id            String         @id @default(cuid())
  usuarioId     String
  tipo          TipoMovimiento
  nombre        String
  color         String
  icono         String
  esDefault     Boolean        @default(false)
  archivada     Boolean        @default(false)
  orden         Int            @default(0)
  creadoEn      DateTime       @default(now())
  actualizadoEn DateTime       @updatedAt

  usuario      Usuario         @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  movimientos  Movimiento[]
  recurrencias Recurrencia[]
  compras      CompraTarjeta[]

  @@unique([usuarioId, tipo, nombre])
  @@map("categorias")
}

model Movimiento {
  id                 String         @id @default(cuid())
  usuarioId          String
  cuentaId           String
  categoriaId        String?
  tipo               TipoMovimiento
  monto              Decimal        @db.Decimal(18, 2)
  moneda             Moneda
  fecha              DateTime       @db.Date
  descripcion        String?
  recurrenciaId      String?
  periodoRecurrencia String?        // YYYY-MM, solo si viene de una recurrencia
  creadoEn           DateTime       @default(now())
  actualizadoEn      DateTime       @updatedAt

  usuario     Usuario      @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  cuenta      Cuenta       @relation(fields: [cuentaId], references: [id], onDelete: Restrict)
  categoria   Categoria?   @relation(fields: [categoriaId], references: [id], onDelete: SetNull)
  recurrencia Recurrencia? @relation(fields: [recurrenciaId], references: [id], onDelete: SetNull)

  @@unique([recurrenciaId, periodoRecurrencia])
  @@index([usuarioId, fecha])
  @@index([usuarioId, categoriaId, fecha])
  @@index([cuentaId])
  @@map("movimientos")
}

model Transferencia {
  id              String   @id @default(cuid())
  usuarioId       String
  cuentaOrigenId  String
  cuentaDestinoId String
  montoOrigen     Decimal  @db.Decimal(18, 2)
  montoDestino    Decimal  @db.Decimal(18, 2)
  fecha           DateTime @db.Date
  descripcion     String?
  creadoEn        DateTime @default(now())
  actualizadoEn   DateTime @updatedAt

  usuario       Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  cuentaOrigen  Cuenta  @relation("TransferenciaOrigen", fields: [cuentaOrigenId], references: [id], onDelete: Restrict)
  cuentaDestino Cuenta  @relation("TransferenciaDestino", fields: [cuentaDestinoId], references: [id], onDelete: Restrict)

  @@index([usuarioId, fecha])
  @@map("transferencias")
}

model Recurrencia {
  id            String         @id @default(cuid())
  usuarioId     String
  cuentaId      String
  categoriaId   String?
  tipo          TipoMovimiento
  monto         Decimal        @db.Decimal(18, 2)
  moneda        Moneda
  descripcion   String
  frecuencia    Frecuencia     @default(MENSUAL)
  diaDelMes     Int            // 1..31, con clamp
  mesDelAnio    Int?           // solo ANUAL
  desde         DateTime       @db.Date
  hasta         DateTime?      @db.Date
  activa        Boolean        @default(true)
  ultimoPeriodoGenerado String? // YYYY-MM del último período procesado por el job (agregado en el paso 2.3)
  creadoEn      DateTime       @default(now())
  actualizadoEn DateTime       @updatedAt

  usuario     Usuario      @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  cuenta      Cuenta       @relation(fields: [cuentaId], references: [id], onDelete: Restrict)
  categoria   Categoria?   @relation(fields: [categoriaId], references: [id], onDelete: SetNull)
  movimientos Movimiento[]

  @@index([usuarioId])
  @@map("recurrencias")
}

model Tarjeta {
  id             String     @id @default(cuid())
  usuarioId      String
  nombre         String
  red            RedTarjeta @default(OTRA)
  ultimos4       String?
  diaCierre      Int        // 1..31, con clamp
  diaVencimiento Int        // 1..31, con clamp
  color          String?
  archivada      Boolean    @default(false)
  creadoEn       DateTime   @default(now())
  actualizadoEn  DateTime   @updatedAt

  usuario Usuario         @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  cierres CierreTarjeta[]
  compras CompraTarjeta[]
  cuotas  Cuota[]
  pagos   PagoResumen[]

  @@index([usuarioId])
  @@map("tarjetas")
}

model CierreTarjeta {
  id               String   @id @default(cuid())
  tarjetaId        String
  periodo          String   // YYYY-MM del vencimiento
  fechaCierre      DateTime @db.Date
  fechaVencimiento DateTime @db.Date

  tarjeta Tarjeta @relation(fields: [tarjetaId], references: [id], onDelete: Cascade)

  @@unique([tarjetaId, periodo])
  @@map("cierres_tarjeta")
}

model CompraTarjeta {
  id             String   @id @default(cuid())
  usuarioId      String
  tarjetaId      String
  categoriaId    String?
  descripcion    String
  fecha          DateTime @db.Date
  montoTotal     Decimal  @db.Decimal(18, 2)
  moneda         Moneda
  cantidadCuotas Int      @default(1)
  creadoEn       DateTime @default(now())
  actualizadoEn  DateTime @updatedAt

  usuario   Usuario    @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  tarjeta   Tarjeta    @relation(fields: [tarjetaId], references: [id], onDelete: Restrict)
  categoria Categoria? @relation(fields: [categoriaId], references: [id], onDelete: SetNull)
  cuotas    Cuota[]

  @@index([usuarioId, fecha])
  @@index([tarjetaId])
  @@map("compras_tarjeta")
}

model Cuota {
  id             String  @id @default(cuid())
  compraId       String
  usuarioId      String  // desnormalizado para consultas por usuario/período
  tarjetaId      String  // desnormalizado
  numero         Int
  monto          Decimal @db.Decimal(18, 2)
  moneda         Moneda
  periodoResumen String  // YYYY-MM

  compra  CompraTarjeta @relation(fields: [compraId], references: [id], onDelete: Cascade)
  usuario Usuario       @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  tarjeta Tarjeta       @relation(fields: [tarjetaId], references: [id], onDelete: Cascade)

  @@unique([compraId, numero])
  @@index([usuarioId, periodoResumen])
  @@index([tarjetaId, periodoResumen])
  @@map("cuotas")
}

model PagoResumen {
  id        String   @id @default(cuid())
  usuarioId String
  tarjetaId String
  cuentaId  String
  periodo   String   // YYYY-MM
  monto     Decimal  @db.Decimal(18, 2)
  moneda    Moneda
  fecha     DateTime @db.Date
  creadoEn  DateTime @default(now())

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  tarjeta Tarjeta @relation(fields: [tarjetaId], references: [id], onDelete: Restrict)
  cuenta  Cuenta  @relation(fields: [cuentaId], references: [id], onDelete: Restrict)

  @@index([usuarioId, periodo])
  @@map("pagos_resumen")
}

model Objetivo {
  id                    String         @id @default(cuid())
  usuarioId             String
  nombre                String
  icono                 String?
  montoObjetivo         Decimal        @db.Decimal(18, 2)
  moneda                Moneda
  fechaObjetivo         DateTime?      @db.Date
  aporteMensualPlaneado Decimal?       @db.Decimal(18, 2)
  estado                EstadoObjetivo @default(ACTIVO)
  creadoEn              DateTime       @default(now())
  actualizadoEn         DateTime       @updatedAt

  usuario Usuario          @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  aportes AporteObjetivo[]

  @@index([usuarioId])
  @@map("objetivos")
}

model AporteObjetivo {
  id         String   @id @default(cuid())
  objetivoId String
  monto      Decimal  @db.Decimal(18, 2) // negativo = retiro
  fecha      DateTime @db.Date
  nota       String?
  creadoEn   DateTime @default(now())

  objetivo Objetivo @relation(fields: [objetivoId], references: [id], onDelete: Cascade)

  @@index([objetivoId, fecha])
  @@map("aportes_objetivo")
}

model Indicador {
  id         String   @id @default(cuid())
  codigo     String   // ver catálogo en sección 7
  fecha      DateTime @db.Date      // fecha a la que corresponde el dato
  valor      Decimal  @db.Decimal(18, 6)
  fuente     String
  urlFuente  String?
  obtenidoEn DateTime @default(now())

  @@unique([codigo, fecha])
  @@index([codigo, fecha(sort: Desc)])
  @@map("indicadores")
}

model PerfilInversor {
  id                   String   @id @default(cuid())
  usuarioId            String
  versionCuestionario  String
  versionPrompt        String
  modelo               String
  respuestas           Json
  conversacion         Json     // preguntas adicionales de la IA y respuestas
  resultado            Json     // perfil, nivel de riesgo, capacidad vs disposición, explicación
  creadoEn             DateTime @default(now())

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId, creadoEn])
  @@map("perfiles_inversor")
}

model Suscripcion {
  id          String            @id @default(cuid())
  usuarioId   String
  plan        Plan
  estado      EstadoSuscripcion @default(PENDIENTE)
  proveedor   ProveedorPago
  proveedorId String?           // id de preapproval de Mercado Pago
  desde       DateTime
  hasta       DateTime?
  creadoEn    DateTime          @default(now())
  actualizadoEn DateTime        @updatedAt

  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId])
  @@unique([proveedor, proveedorId])
  @@map("suscripciones")
}

model Auditoria {
  id        String   @id @default(cuid())
  usuarioId String?  // sujeto afectado
  actorId   String?  // quién lo hizo (puede ser un admin)
  accion    String   // ej. "cuenta.eliminar", "usuario.exportar", "admin.cambiar_plan"
  entidad   String
  entidadId String?
  datos     Json?
  ip        String?
  creadoEn  DateTime @default(now())

  @@index([usuarioId, creadoEn])
  @@index([accion, creadoEn])
  @@map("auditoria")
}
```

### 5.3 Schema Prisma — Asesoramiento (Fase 11, NO migrar antes)

Refleja lo que hoy está en Firestore en el admin (`clients`, `brokers`, `planes`, `servicios`).

```prisma
enum PerfilRiesgo {
  CONSERVADOR
  MODERADO
  AGRESIVO
}

model ClienteAsesoramiento {
  id                    String        @id @default(cuid())
  faktiaReferencia      String        @unique // id del doc de Firestore: Faktia asocia por referenciaExterna
  usuarioId             String?       @unique // si además es usuario de la plataforma
  nombre                String
  apellido              String
  email                 String?
  telefono              String?
  perfilInversor        PerfilRiesgo?
  objetivos             String?
  horizonteInversion    String?
  fiscal                Json?         // tipoDocumento, numeroDocumento, condicionIva, razonSocial, domicilio
  notas                 Json?
  ultimoContacto        DateTime?
  deshabilitadoEn       DateTime?
  motivoDeshabilitacion String?
  creadoEn              DateTime      @default(now())
  actualizadoEn         DateTime      @updatedAt

  brokers     ClienteBroker[]
  suscripcion SuscripcionAsesoramiento?

  @@map("clientes_asesoramiento")
}

model Broker {
  id               String  @id @default(cuid())
  faktiaReferencia String  @unique // "broker:<id Firestore>"
  nombre           String  @unique
  email            String?
  telefono         String?
  notas            String?
  fiscal           Json?

  clientes ClienteBroker[]

  @@map("brokers")
}

model ClienteBroker {
  clienteId String
  brokerId  String

  cliente ClienteAsesoramiento @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  broker  Broker               @relation(fields: [brokerId], references: [id], onDelete: Restrict)

  @@id([clienteId, brokerId])
  @@map("clientes_brokers")
}

model PlanAsesoramiento {
  id     String  @id @default(cuid())
  nombre String
  precio Decimal @db.Decimal(18, 2)

  suscripciones SuscripcionAsesoramiento[]

  @@map("planes_asesoramiento")
}

model ServicioAsesoramiento {
  id     String  @id @default(cuid())
  nombre String
  precio Decimal @db.Decimal(18, 2)

  @@map("servicios_asesoramiento")
}

model SuscripcionAsesoramiento {
  id        String  @id @default(cuid())
  clienteId String  @unique
  planId    String?
  desde     String  // YYYY-MM, mes de alta (se cobra completo)
  hasta     String? // YYYY-MM, último mes facturado

  cliente   ClienteAsesoramiento @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  plan      PlanAsesoramiento?   @relation(fields: [planId], references: [id], onDelete: SetNull)
  historial MontoSuscripcion[]

  @@map("suscripciones_asesoramiento")
}

model MontoSuscripcion {
  id            String  @id @default(cuid())
  suscripcionId String
  monto         Decimal @db.Decimal(18, 2)
  desde         String  // YYYY-MM

  suscripcion SuscripcionAsesoramiento @relation(fields: [suscripcionId], references: [id], onDelete: Cascade)

  @@unique([suscripcionId, desde])
  @@map("montos_suscripcion")
}
```

### 5.4 Etapas futuras (sin schema todavía)

- **Etapa 2 — Contenido:** `Informe` (título, slug, categoría, cuerpo en Markdown/JSON de editor, nivel de acceso por feature, publicado/borrador, fecha), `RecursoEducativo`, `ResumenMercado`. Editor en el admin. Informes públicos → evaluar SSR (Astro/Next) para SEO.
- **Etapa 3 — Inversiones:** `CarteraModelo` + `VersionCartera` + `ComponenteCartera` (instrumento, %), `Emisor`, `ObligacionNegociable`, `FlujoON` (fecha, interés, amortización), `PrecioInstrumento` (serie temporal), `CalificacionCrediticia`, `ClasificacionEmisor` (verde/amarillo/rojo + criterio + fecha), `PosicionUsuario`, `Alerta`. Cálculos (TIR, duration, paridad) en `packages/shared`.
- **Etapa 4 — Acciones:** `Empresa`, `Cotizacion`, `RatioHistorico`, `PrecioObjetivo` (de terceros, separado de valuaciones propias).
- **Etapa 5 — IA:** `Conversacion`, `MensajeIA`, embeddings de contenido con pgvector.

---

## 6. API — Lanzamiento 1

Prefijo `/api/v1`. Todos privados salvo indicación.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Público. Estado + versión |
| GET | `/me` | Usuario, plan, features, onboarding |
| PATCH | `/me` | Nombre, moneda principal, onboarding completado |
| GET | `/me/exportar` | JSON con todos los datos del usuario |
| DELETE | `/me` | Baja de cuenta (soft delete + borrado definitivo a los 30 días) |
| GET/POST | `/cuentas` | Listar (con saldo actual) / crear |
| PATCH/DELETE | `/cuentas/:id` | Editar / borrar (409 si tiene movimientos → archivar) |
| GET/POST | `/categorias` | `?tipo=GASTO\|INGRESO` |
| PATCH/DELETE | `/categorias/:id` | Borrar con movimientos → 409, se archiva |
| GET | `/movimientos` | `?desde&hasta&tipo&cuentaId&categoriaId&q&cursor&limit` |
| POST | `/movimientos` | Crear |
| PATCH/DELETE | `/movimientos/:id` | |
| GET/POST | `/transferencias` | |
| PATCH/DELETE | `/transferencias/:id` | |
| GET/POST | `/recurrencias` | |
| PATCH/DELETE | `/recurrencias/:id` | Borrar no borra movimientos ya generados |
| GET/POST | `/tarjetas` | |
| PATCH/DELETE | `/tarjetas/:id` | Cambio de cierre → recálculo de períodos |
| PUT | `/tarjetas/:id/cierres/:periodo` | Override de fechas de un resumen |
| DELETE | `/tarjetas/:id/cierres/:periodo` | Vuelve a las fechas calculadas |
| GET/POST | `/tarjetas/compras` | `?tarjetaId&desde&hasta` |
| PATCH/DELETE | `/tarjetas/compras/:id` | Regenera cuotas |
| GET | `/tarjetas/resumen` | `?tarjetaId&periodo` → cuotas del resumen, total por moneda, fechas |
| GET | `/tarjetas/compromisos` | `?meses=12` → total comprometido por período y tarjeta |
| GET/POST | `/tarjetas/pagos` | Pagos de resumen (`?tarjetaId&periodo`) |
| DELETE | `/tarjetas/pagos/:id` | |
| GET/POST | `/objetivos` | Con acumulado, avance y aporte sugerido |
| PATCH/DELETE | `/objetivos/:id` | |
| POST | `/objetivos/:id/aportes` | |
| DELETE | `/objetivos/:id/aportes/:aporteId` | |
| GET | `/resumen/mensual` | `?periodo` → por moneda: ingresos, gastos (movimientos + cuotas), saldo, % de ingresos gastado, por categoría |
| GET | `/resumen/evolucion` | `?meses=12` → ingresos y gastos por mes y moneda |
| GET | `/indicadores` | Público. Último valor de cada indicador + fecha + fuente + brecha calculada |
| GET | `/indicadores/:codigo/historico` | Público. `?desde&hasta` |
| POST | `/internal/jobs/:job` | Header `X-Jobs-Secret`. Jobs: `indicadores`, `recurrencias`, `purgar-cuentas` |
| GET | `/admin/usuarios` | ADMIN. Filtros, paginado |
| PATCH | `/admin/usuarios/:id/plan` | ADMIN. Cambio manual de plan (auditado) |
| GET | `/admin/metricas` | ADMIN. Registros por día, activos 7/30 días, movimientos cargados, retención simple |
| GET | `/admin/auditoria` | ADMIN |
| GET/PUT | `/admin/indicadores` | ADMIN. Ver y corregir manualmente un valor |

Paginación por cursor: `{ items, nextCursor }`. Swagger en `/api/docs` (solo fuera de producción o con auth básica).

---

## 7. Datos externos

| Indicador (`codigo`) | Fuente a validar | Frecuencia |
|---|---|---|
| `DOLAR_OFICIAL_COMPRA`, `DOLAR_OFICIAL_VENTA` | DolarApi / BCRA | Cada hora en horario de mercado |
| `DOLAR_MEP_COMPRA`, `DOLAR_MEP_VENTA` | DolarApi | Cada hora en horario de mercado |
| `DOLAR_CCL_COMPRA`, `DOLAR_CCL_VENTA` | DolarApi | Cada hora en horario de mercado |
| `IPC_MENSUAL` | ArgentinaDatos / API de series de datos.gob.ar (INDEC) | Diario (publica 1 vez por mes) |
| Brecha | Calculada: MEP venta / oficial venta − 1 | Al consultar |
| IPC acumulado del año | Calculado: producto de (1 + IPC mensual) − 1 | Al consultar |

Implementación:
- Interfaz `ProveedorIndicadores { obtener(): Promise<ValorIndicador[]> }`, un adaptador por fuente.
- El job hace upsert por `(codigo, fecha)`. Si una fuente falla, se loguea en Sentry y se mantiene el último valor; el front muestra la fecha del dato.
- Antes de usar una fuente en producción: revisar términos de uso comercial, límites y estabilidad. Documentar el resultado en esta sección.

Etapas 3/4 (ON, precios, acciones): a investigar costos y licencias (BYMA, APIs de brokers, proveedores internacionales, TradingView). Es la decisión que más afecta el costo del producto.

---

## 8. Jobs programados

Disparados por **GitHub Actions `schedule`** llamando a `POST /api/v1/internal/jobs/:job` con `X-Jobs-Secret` (gratis, con logs). Si la frecuencia o la confiabilidad no alcanzan, se pasa a Render Cron Jobs.

| Job | Frecuencia |
|---|---|
| `indicadores` | Cada hora, lunes a viernes 10–18 h (ART), más 1 vez diaria |
| `recurrencias` | Diario 03:00 ART (idempotente) |
| `purgar-cuentas` | Diario 04:00 ART |

---

## 9. Seguridad y privacidad

- HTTPS en todos lados (Render, Firebase Hosting, Neon con SSL).
- `helmet`, CORS con lista de orígenes, `@nestjs/throttler` (límite global + más estricto en endpoints sensibles).
- Validación estricta de input (zod, sin campos extra).
- Aislamiento por usuario en todos los servicios + tests e2e que verifican que un usuario no puede leer/modificar datos de otro.
- Auditoría de: baja de cuenta, exportación, cambios de plan, acciones de admin.
- Secretos solo en variables de entorno (Render / GitHub Secrets). Nada de `.env` versionado. Service account de Firebase solo en la API.
- Backups: Neon con restauración a un punto en el tiempo (plan pago desde el lanzamiento público).
- Exportación y borrado de datos por el usuario (Ley 25.326). Política de privacidad y términos: los redacta EFE con asesoramiento legal; la app los muestra y registra la aceptación (fecha + versión).
- Disclaimers de contenido financiero (carteras modelo, test de perfil, IA): textos definidos por Flor según su habilitación ante la CNV.
- No se guardan números completos de tarjeta: solo los últimos 4 dígitos, opcionales.

---

## 10. Entornos y deploy

| Entorno | API | DB | Web / Admin |
|---|---|---|---|
| Local | `pnpm dev` (puerto 3000) | Neon `efe-plataforma-desarrollo`, rama `develop` | Vite (5173 web, 5174 admin) |
| Tests e2e | Jest | Neon `efe-plataforma-desarrollo`, rama `test` (o Postgres de Docker: `docker compose up db`) | — |
| Producción | Render (web service, plan Starter, sin dormirse) | Neon `efe-plataforma`, rama `production` | Firebase Hosting `efecapitaladmin`, sitios `efe-web` y `efe-admin` |

**Neon: producción y desarrollo en proyectos separados** (mismo criterio que Vialto). La cuota de cómputo de Neon es por proyecto: si desarrollo vive como rama del proyecto de producción, puede agotarla y suspender producción (le pasó a Vialto en sep 2026). Por eso:

| Proyecto Neon | ID | Ramas | Máx. compute |
|---|---|---|---|
| `efe-plataforma` (producción) | `plain-shadow-50025502` | solo `production` | 2 CU |
| `efe-plataforma-desarrollo` | `rapid-recipe-19586937` | `develop` (local), `test` (e2e) | 1 CU |

- No crear ramas de desarrollo ni de pruebas dentro de `efe-plataforma`.
- Región `aws-sa-east-1` (São Paulo), Postgres 18.
- Las migraciones se crean y prueban en `develop`; en producción solo se aplican con `prisma migrate deploy` (pre-deploy de Render). Nunca `migrate dev` ni `migrate reset` contra producción.

### Variables de entorno

**API**
```
NODE_ENV, PORT
DATABASE_URL          # Neon pooled
DIRECT_URL            # Neon directo (migraciones)
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
CORS_ORIGINS          # coma separada
JOBS_SECRET
SENTRY_DSN
```

**Web**
```
VITE_API_URL
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID
VITE_SENTRY_DSN
```

**Admin**: las de Web + `VITE_FAKTIA_API_URL`, `VITE_FAKTIA_APP_URL`.

### CI/CD (GitHub Actions)

- `ci.yml` (PR y push a `main`): install, `turbo lint typecheck test build`, verificación de que no hay migraciones pendientes de generar (`prisma migrate diff`).
- `deploy-web.yml` / `deploy-admin.yml` (push a `main` con cambios en la app o en `packages/`): build + `firebase deploy --only hosting:<sitio>`.
- API: Render con auto-deploy desde `main`. Build: `pnpm install --frozen-lockfile && pnpm turbo build --filter=api`. Pre-deploy: `pnpm --filter api prisma migrate deploy`. Health check: `/api/v1/health`.
- `jobs.yml`: los crons de la sección 8.

### Dominios (a definir)

- `app.<dominio>` → web
- `admin.<dominio>` → admin
- `api.<dominio>` → Render
- La landing actual (proyecto Firebase `efe-capital`) linkea a `app.`

---

## 11. Decisiones pendientes

| # | Decisión | Quién |
|---|---|---|
| 1 | Criterio caja (cuotas en el mes del resumen) vs devengado | Flor + Elías |
| 2 | Conversión ARS/USD en el dashboard: ¿con qué dólar? | Flor |
| 3 | Menú, dashboard y navegación (wireframes) antes de la Fase 2 web | Flor + Elías |
| 4 | Habilitación CNV de Flor y textos de disclaimers | Flor |
| 5 | Quién factura las suscripciones (monotributo de Flor vía Faktia / SAS) | Contador |
| 6 | Acuerdo de socios (porcentajes, propiedad del código y la marca) | Ambos + abogado |
| 7 | Dominio | Ambos |
| 8 | Proveedor de IA para L1.5 | Elías |
| 9 | Fuentes de datos de ON y su costo (antes de la Etapa 3) | Elías |
