import { z } from 'zod';

/** Respuesta paginada por cursor (ARCHITECTURE §6): { items, nextCursor }. */
export function paginaSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    /** null si no hay más páginas. Se manda tal cual en `?cursor=`. */
    nextCursor: z.string().nullable(),
  });
}

export interface Pagina<T> {
  items: T[];
  nextCursor: string | null;
}
