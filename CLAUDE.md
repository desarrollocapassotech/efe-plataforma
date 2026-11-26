# EFE Capital — Plataforma

Plataforma de inteligencia financiera personal (B2C, freemium) de EFE Capital. Monorepo con API (NestJS), web de usuarios (React PWA) y back-office (admin).

## Antes de cualquier tarea

1. Leé `docs/ARCHITECTURE.md`: es la fuente de verdad de stack, estructura, modelo de datos, API y decisiones.
2. Mirá `docs/PROGRESS.md` para saber qué paso de `docs/PLAN.md` está hecho y qué quedó pendiente.
3. Si vas a tocar `apps/admin`, leé también `apps/admin/CLAUDE.md` (estilo visual y patrones de pantallas obligatorios).
4. Si algo del pedido contradice la arquitectura o no está definido, frená y preguntá. No inventes decisiones de producto.

## Comandos

```bash
pnpm install
pnpm dev                          # todas las apps
pnpm --filter @efe/api dev        # API en :3000
pnpm --filter @efe/web dev        # web en :5173
pnpm --filter @efe/admin dev      # admin en :5174
pnpm turbo lint typecheck test build
pnpm --filter @efe/api test:e2e   # requiere docker compose up db (o DATABASE_URL de Neon test)
pnpm --filter @efe/api prisma migrate dev --name <nombre>
```

## Reglas

- **Plata:** nunca `number`. `Decimal` en Prisma, `string` en JSON, helpers de `@efe/shared/dinero` en código. Todo monto va con su moneda (`ARS` | `USD`). No sumar monedas distintas.
- **Fechas:** de negocio como `YYYY-MM-DD`, períodos como `YYYY-MM`, helpers de `@efe/shared/fechas`. No depender de la zona horaria del proceso.
- **Cálculos financieros** (cuotas, períodos de resumen, objetivos, TIR) solo en `packages/shared`, con tests. API y front importan de ahí.
- **Schemas zod** en `packages/shared/src/schemas`. Los DTOs de Nest se crean con `createZodDto`; el front valida con los mismos schemas.
- **Aislamiento:** toda consulta filtra por el `usuarioId` de `@CurrentUser()`. Recurso de otro usuario → 404. Nunca aceptar `usuarioId` del cliente (salvo endpoints admin).
- **Permisos:** funcionalidades nuevas declaran su feature (`@RequiresFeature`) según `FEATURES_POR_PLAN`.
- **Errores:** `AppException(code, message, status)` con códigos estables en MAYÚSCULAS.
- **Agregados en SQL**, nunca traer todas las filas para sumar en memoria.
- **Tests:** todo cálculo con unit tests; todo endpoint nuevo con e2e que incluya aislamiento entre dos usuarios.
- **Dependencias:** no agregar sin explicar para qué y por qué esa.
- **Secretos:** nunca en el repo. Solo `.env.example`. No leer ni modificar `.env` reales.
- **UI:** textos en español rioplatense neutro (vos). Tokens de color del preset de `packages/config`, nunca colores fijos de Tailwind. Mobile-first en la web.
- **Commits:** Conventional Commits en español. Un paso del plan = un PR.
- Al terminar un paso: lint, typecheck, tests y build de lo tocado; actualizar `docs/PROGRESS.md`; si cambió una decisión, actualizar `docs/ARCHITECTURE.md` en el mismo PR.

## Proyectos relacionados (fuera del repo)

- `../../gastos`: app personal vieja de gastos (Firebase `mis-gastos-mes`). Solo referencia de UX y origen de la migración de la Fase 9. No copiar su modelo de datos.
- `../efecapital-portal-admin`: admin viejo, movido a `apps/admin` en el paso 1.7.
- `../../FAKTIA`: facturación electrónica. El admin factura vía su API pública con el ID token de Firebase.
