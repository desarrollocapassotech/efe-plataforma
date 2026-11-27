/**
 * Mini gráfico de línea (sin ejes): la forma de la serie de un vistazo. Los valores
 * exactos están en el texto de la tarjeta. Los montos se pasan a number solo para dibujar.
 */
export function Sparkline({ valores, className }: { valores: string[]; className?: string }) {
  const nums = valores.map(Number).filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const rango = max - min || 1;
  const ancho = 100;
  const alto = 28;
  const puntos = nums.map((n, i) => {
    const x = (i / (nums.length - 1)) * ancho;
    const y = alto - 3 - ((n - min) / rango) * (alto - 6);
    return [x, y] as const;
  });
  const [, uy] = puntos.at(-1)!;
  return (
    <div className={className ?? 'relative h-8 w-full text-primary'} aria-hidden>
      <svg
        viewBox={`0 0 ${ancho} ${alto}`}
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <polyline
          points={puntos.map(([x, y]) => `${x},${y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* El punto final va en HTML para que no se deforme con el SVG estirado. */}
      <span
        className="absolute -right-1 h-2 w-2 -translate-y-1/2 rounded-full bg-current ring-2 ring-card"
        style={{ top: `${(uy / alto) * 100}%` }}
      />
    </div>
  );
}
