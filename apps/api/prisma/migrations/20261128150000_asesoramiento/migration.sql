-- CreateEnum
CREATE TYPE "PerfilRiesgo" AS ENUM ('CONSERVADOR', 'MODERADO', 'AGRESIVO');

-- CreateTable
CREATE TABLE "clientes_asesoramiento" (
    "id" TEXT NOT NULL,
    "faktiaReferencia" TEXT NOT NULL,
    "usuarioId" TEXT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "perfilInversor" "PerfilRiesgo",
    "objetivos" TEXT,
    "horizonteInversion" TEXT,
    "fiscal" JSONB,
    "notas" JSONB,
    "ultimoContacto" TIMESTAMP(3),
    "deshabilitadoEn" TIMESTAMP(3),
    "motivoDeshabilitacion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_asesoramiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brokers" (
    "id" TEXT NOT NULL,
    "faktiaReferencia" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "notas" TEXT,
    "fiscal" JSONB,

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes_brokers" (
    "clienteId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,

    CONSTRAINT "clientes_brokers_pkey" PRIMARY KEY ("clienteId","brokerId")
);

-- CreateTable
CREATE TABLE "planes_asesoramiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "planes_asesoramiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios_asesoramiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "servicios_asesoramiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones_asesoramiento" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "planId" TEXT,
    "desde" TEXT NOT NULL,
    "hasta" TEXT,

    CONSTRAINT "suscripciones_asesoramiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "montos_suscripcion" (
    "id" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "monto" DECIMAL(18,2) NOT NULL,
    "desde" TEXT NOT NULL,

    CONSTRAINT "montos_suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_asesoramiento_faktiaReferencia_key" ON "clientes_asesoramiento"("faktiaReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_asesoramiento_usuarioId_key" ON "clientes_asesoramiento"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_faktiaReferencia_key" ON "brokers"("faktiaReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_nombre_key" ON "brokers"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_asesoramiento_clienteId_key" ON "suscripciones_asesoramiento"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "montos_suscripcion_suscripcionId_desde_key" ON "montos_suscripcion"("suscripcionId", "desde");

-- AddForeignKey
ALTER TABLE "clientes_asesoramiento" ADD CONSTRAINT "clientes_asesoramiento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes_brokers" ADD CONSTRAINT "clientes_brokers_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes_asesoramiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes_brokers" ADD CONSTRAINT "clientes_brokers_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "brokers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones_asesoramiento" ADD CONSTRAINT "suscripciones_asesoramiento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes_asesoramiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones_asesoramiento" ADD CONSTRAINT "suscripciones_asesoramiento_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes_asesoramiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "montos_suscripcion" ADD CONSTRAINT "montos_suscripcion_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "suscripciones_asesoramiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

