/**
 * Conversión entre fechas de negocio (`YYYY-MM-DD`) y columnas `@db.Date` de Prisma.
 * Prisma representa un DATE como medianoche UTC: se arma y se lee siempre en UTC para
 * no depender de la zona horaria del proceso.
 */
export const fechaADb = (fecha: string): Date => new Date(`${fecha}T00:00:00.000Z`);

export const fechaDeDb = (fecha: Date): string => fecha.toISOString().slice(0, 10);
