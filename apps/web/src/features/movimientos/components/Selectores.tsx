import { hoy as hoyAR, sumarDias } from '@efe/shared/fechas';
import type { Categoria, Cuenta, TipoMovimiento } from '@efe/shared/schemas';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { IconoCategoria } from '@/features/categorias/components/IconoCategoria';
import { iconoDeCuenta } from '@/features/cuentas/tipos';
import { fechaCorta } from '@/lib/fechas-ui';
import { cn } from '@/lib/utils';

/** Control segmentado (dos o tres opciones excluyentes, grande para el pulgar). */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onChange,
  etiqueta,
}: {
  opciones: { valor: T; nombre: string }[];
  valor: T;
  onChange: (valor: T) => void;
  etiqueta: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="grid auto-cols-fr grid-flow-col rounded-lg bg-muted p-1"
    >
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onChange(o.valor)}
          className={cn(
            'h-10 rounded-md text-sm font-medium transition',
            valor === o.valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground',
          )}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

export const OPCIONES_TIPO: { valor: TipoMovimiento; nombre: string }[] = [
  { valor: 'GASTO', nombre: 'Gasto' },
  { valor: 'INGRESO', nombre: 'Ingreso' },
];

/**
 * Categorías como grilla de emojis, en el orden que eligió el usuario (las que más usa
 * primero, ver Categorías → Ordenar). Tocar la elegida de nuevo la deselecciona.
 */
export function GrillaCategorias({
  categorias,
  valor,
  onChange,
}: {
  categorias: Categoria[];
  valor: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Categoría" className="grid grid-cols-4 gap-1 sm:grid-cols-5">
      {categorias.map((c) => {
        const elegida = c.id === valor;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={elegida}
            onClick={() => onChange(elegida ? null : c.id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] leading-tight transition',
              elegida
                ? 'bg-primary/10 font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            <IconoCategoria
              icono={c.icono}
              color={c.color}
              tamano="sm"
              className={cn(elegida && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}
            />
            <span className="line-clamp-2 w-full hyphens-auto break-words text-center" lang="es">
              {c.nombre}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Cuentas como chips horizontales (con scroll si son muchas). */
export function SelectorCuenta({
  cuentas,
  valor,
  onChange,
  etiqueta = 'Cuenta',
}: {
  cuentas: Cuenta[];
  valor: string | null;
  onChange: (id: string) => void;
  etiqueta?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {cuentas.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={c.id === valor}
          onClick={() => onChange(c.id)}
          className={cn(
            'flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition',
            c.id === valor
              ? 'border-primary bg-primary/5 text-foreground'
              : 'text-muted-foreground hover:bg-accent',
          )}
        >
          <span aria-hidden>{iconoDeCuenta(c.tipo)}</span>
          {c.nombre}
          {c.moneda === 'USD' && <span className="text-xs text-muted-foreground">US$</span>}
        </button>
      ))}
    </div>
  );
}

/** Fecha con atajos: Hoy, Ayer u otra (calendario nativo del celular). */
export function SelectorFecha({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (fecha: string) => void;
}) {
  const hoy = hoyAR();
  const ayer = sumarDias(hoy, -1);
  const esOtra = valor !== hoy && valor !== ayer;
  const [mostrarCalendario, setMostrarCalendario] = useState(esOtra);

  const chip = (activo: boolean) =>
    cn(
      'flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition',
      activo
        ? 'border-primary bg-primary/5 text-foreground'
        : 'text-muted-foreground hover:bg-accent',
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={valor === hoy}
        className={chip(valor === hoy)}
        onClick={() => {
          setMostrarCalendario(false);
          onChange(hoy);
        }}
      >
        Hoy
      </button>
      <button
        type="button"
        aria-pressed={valor === ayer}
        className={chip(valor === ayer)}
        onClick={() => {
          setMostrarCalendario(false);
          onChange(ayer);
        }}
      >
        Ayer
      </button>
      {mostrarCalendario || esOtra ? (
        <input
          type="date"
          aria-label="Fecha"
          value={valor}
          max="2100-12-31"
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className={cn(chip(esOtra), 'bg-card')}
        />
      ) : (
        <button type="button" className={chip(false)} onClick={() => setMostrarCalendario(true)}>
          <CalendarDays className="h-4 w-4" /> Otro día
        </button>
      )}
      {esOtra && <span className="sr-only">{fechaCorta(valor)}</span>}
    </div>
  );
}

/** Mensaje de error de un formulario. */
export function ErrorFormulario({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return (
    <p
      role="alert"
      className="rounded-md border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-sm"
    >
      {mensaje}
    </p>
  );
}
