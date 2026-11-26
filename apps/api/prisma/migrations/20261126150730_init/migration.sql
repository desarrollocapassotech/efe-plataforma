-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('USUARIO', 'ADMIN');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PREMIUM', 'ASESORAMIENTO');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "TipoCuenta" AS ENUM ('EFECTIVO', 'BANCO', 'BILLETERA', 'INVERSION', 'OTRA');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'GASTO');

-- CreateEnum
CREATE TYPE "Frecuencia" AS ENUM ('MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "RedTarjeta" AS ENUM ('VISA', 'MASTERCARD', 'AMEX', 'CABAL', 'NARANJA', 'OTRA');

-- CreateEnum
CREATE TYPE "EstadoObjetivo" AS ENUM ('ACTIVO', 'CUMPLIDO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('PENDIENTE', 'ACTIVA', 'PAUSADA', 'CANCELADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "ProveedorPago" AS ENUM ('MERCADOPAGO', 'MANUAL');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "firebaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "monedaPrincipal" "Moneda" NOT NULL DEFAULT 'ARS',
    "onboardingCompletado" BOOLEAN NOT NULL DEFAULT false,
    "ultimoAccesoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "eliminadoEn" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCuenta" NOT NULL DEFAULT 'OTRA',
    "moneda" "Moneda" NOT NULL DEFAULT 'ARS',
    "color" TEXT,
    "saldoInicial" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icono" TEXT NOT NULL,
    "esDefault" BOOLEAN NOT NULL DEFAULT false,
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "tipo" "TipoMovimiento" NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT,
    "recurrenciaId" TEXT,
    "periodoRecurrencia" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cuentaOrigenId" TEXT NOT NULL,
    "cuentaDestinoId" TEXT NOT NULL,
    "montoOrigen" DECIMAL(18,2) NOT NULL,
    "montoDestino" DECIMAL(18,2) NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrencias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "tipo" "TipoMovimiento" NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "frecuencia" "Frecuencia" NOT NULL DEFAULT 'MENSUAL',
    "diaDelMes" INTEGER NOT NULL,
    "mesDelAnio" INTEGER,
    "desde" DATE NOT NULL,
    "hasta" DATE,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarjetas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "red" "RedTarjeta" NOT NULL DEFAULT 'OTRA',
    "ultimos4" TEXT,
    "diaCierre" INTEGER NOT NULL,
    "diaVencimiento" INTEGER NOT NULL,
    "color" TEXT,
    "archivada" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarjetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cierres_tarjeta" (
    "id" TEXT NOT NULL,
    "tarjetaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "fechaCierre" DATE NOT NULL,
    "fechaVencimiento" DATE NOT NULL,

    CONSTRAINT "cierres_tarjeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_tarjeta" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tarjetaId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "montoTotal" DECIMAL(18,2) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "cantidadCuotas" INTEGER NOT NULL DEFAULT 1,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compras_tarjeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotas" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tarjetaId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "periodoResumen" TEXT NOT NULL,

    CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_resumen" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tarjetaId" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "fecha" DATE NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_resumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objetivos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT,
    "montoObjetivo" DECIMAL(18,2) NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "fechaObjetivo" DATE,
    "aporteMensualPlaneado" DECIMAL(18,2),
    "estado" "EstadoObjetivo" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objetivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aportes_objetivo" (
    "id" TEXT NOT NULL,
    "objetivoId" TEXT NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "fecha" DATE NOT NULL,
    "nota" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aportes_objetivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicadores" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "valor" DECIMAL(18,6) NOT NULL,
    "fuente" TEXT NOT NULL,
    "urlFuente" TEXT,
    "obtenidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_inversor" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "versionCuestionario" TEXT NOT NULL,
    "versionPrompt" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "respuestas" JSONB NOT NULL,
    "conversacion" JSONB NOT NULL,
    "resultado" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfiles_inversor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'PENDIENTE',
    "proveedor" "ProveedorPago" NOT NULL,
    "proveedorId" TEXT,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "actorId" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "datos" JSONB,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_firebaseUid_key" ON "usuarios"("firebaseUid");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "cuentas_usuarioId_idx" ON "cuentas"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_usuarioId_tipo_nombre_key" ON "categorias"("usuarioId", "tipo", "nombre");

-- CreateIndex
CREATE INDEX "movimientos_usuarioId_fecha_idx" ON "movimientos"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_usuarioId_categoriaId_fecha_idx" ON "movimientos"("usuarioId", "categoriaId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_cuentaId_idx" ON "movimientos"("cuentaId");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_recurrenciaId_periodoRecurrencia_key" ON "movimientos"("recurrenciaId", "periodoRecurrencia");

-- CreateIndex
CREATE INDEX "transferencias_usuarioId_fecha_idx" ON "transferencias"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "recurrencias_usuarioId_idx" ON "recurrencias"("usuarioId");

-- CreateIndex
CREATE INDEX "tarjetas_usuarioId_idx" ON "tarjetas"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "cierres_tarjeta_tarjetaId_periodo_key" ON "cierres_tarjeta"("tarjetaId", "periodo");

-- CreateIndex
CREATE INDEX "compras_tarjeta_usuarioId_fecha_idx" ON "compras_tarjeta"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "compras_tarjeta_tarjetaId_idx" ON "compras_tarjeta"("tarjetaId");

-- CreateIndex
CREATE INDEX "cuotas_usuarioId_periodoResumen_idx" ON "cuotas"("usuarioId", "periodoResumen");

-- CreateIndex
CREATE INDEX "cuotas_tarjetaId_periodoResumen_idx" ON "cuotas"("tarjetaId", "periodoResumen");

-- CreateIndex
CREATE UNIQUE INDEX "cuotas_compraId_numero_key" ON "cuotas"("compraId", "numero");

-- CreateIndex
CREATE INDEX "pagos_resumen_usuarioId_periodo_idx" ON "pagos_resumen"("usuarioId", "periodo");

-- CreateIndex
CREATE INDEX "objetivos_usuarioId_idx" ON "objetivos"("usuarioId");

-- CreateIndex
CREATE INDEX "aportes_objetivo_objetivoId_fecha_idx" ON "aportes_objetivo"("objetivoId", "fecha");

-- CreateIndex
CREATE INDEX "indicadores_codigo_fecha_idx" ON "indicadores"("codigo", "fecha" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "indicadores_codigo_fecha_key" ON "indicadores"("codigo", "fecha");

-- CreateIndex
CREATE INDEX "perfiles_inversor_usuarioId_creadoEn_idx" ON "perfiles_inversor"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "suscripciones_usuarioId_idx" ON "suscripciones"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_proveedor_proveedorId_key" ON "suscripciones"("proveedor", "proveedorId");

-- CreateIndex
CREATE INDEX "auditoria_usuarioId_creadoEn_idx" ON "auditoria"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "auditoria_accion_creadoEn_idx" ON "auditoria"("accion", "creadoEn");

-- AddForeignKey
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_recurrenciaId_fkey" FOREIGN KEY ("recurrenciaId") REFERENCES "recurrencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_cuentaOrigenId_fkey" FOREIGN KEY ("cuentaOrigenId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_cuentaDestinoId_fkey" FOREIGN KEY ("cuentaDestinoId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrencias" ADD CONSTRAINT "recurrencias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrencias" ADD CONSTRAINT "recurrencias_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrencias" ADD CONSTRAINT "recurrencias_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_tarjeta" ADD CONSTRAINT "cierres_tarjeta_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_tarjeta" ADD CONSTRAINT "compras_tarjeta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_tarjeta" ADD CONSTRAINT "compras_tarjeta_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjetas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_tarjeta" ADD CONSTRAINT "compras_tarjeta_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras_tarjeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_resumen" ADD CONSTRAINT "pagos_resumen_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_resumen" ADD CONSTRAINT "pagos_resumen_tarjetaId_fkey" FOREIGN KEY ("tarjetaId") REFERENCES "tarjetas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_resumen" ADD CONSTRAINT "pagos_resumen_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aportes_objetivo" ADD CONSTRAINT "aportes_objetivo_objetivoId_fkey" FOREIGN KEY ("objetivoId") REFERENCES "objetivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_inversor" ADD CONSTRAINT "perfiles_inversor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
