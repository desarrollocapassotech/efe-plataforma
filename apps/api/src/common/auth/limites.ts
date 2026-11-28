/**
 * Límites de requests más estrictos que el global (100/min por IP, ARCHITECTURE §9).
 * Endpoints admin: 60 por minuto (un panel no necesita más; frena un token robado).
 */
export const LIMITE_ADMIN = { default: { limit: 60, ttl: 60_000 } };
