import { Fragment, type ReactNode } from 'react';

/**
 * Markdown mínimo para los textos legales (títulos, párrafos, listas, citas y negrita).
 * Sin dependencias: los textos son nuestros y simples. Si hiciera falta más, evaluar
 * una librería.
 */
function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((parte, i) => {
    if (parte.startsWith('**') && parte.endsWith('**'))
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    if (parte.startsWith('`') && parte.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-muted px-1 text-[0.9em]">
          {parte.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{parte}</Fragment>;
  });
}

export function Markdown({ texto }: { texto: string }) {
  const bloques = texto.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {bloques.map((bloque, i) => {
        const lineas = bloque.split('\n');
        const primera = lineas[0]!;
        if (primera.startsWith('### '))
          return (
            <h3 key={i} className="font-semibold">
              {enLinea(primera.slice(4))}
            </h3>
          );
        if (primera.startsWith('## '))
          return (
            <h2 key={i} className="pt-2 text-lg font-semibold">
              {enLinea(primera.slice(3))}
            </h2>
          );
        if (primera.startsWith('# '))
          return (
            <h1 key={i} className="text-2xl font-semibold">
              {enLinea(primera.slice(2))}
            </h1>
          );
        if (lineas.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lineas.map((l, j) => (
                <li key={j}>{enLinea(l.slice(2))}</li>
              ))}
            </ul>
          );
        }
        if (primera.startsWith('> ')) {
          return (
            <blockquote
              key={i}
              className="rounded-md border-l-2 border-warning bg-warning/10 px-3 py-2"
            >
              {enLinea(lineas.map((l) => l.replace(/^> ?/, '')).join(' '))}
            </blockquote>
          );
        }
        return <p key={i}>{enLinea(lineas.join(' '))}</p>;
      })}
    </div>
  );
}
