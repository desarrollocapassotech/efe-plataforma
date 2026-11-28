import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Markdown } from '@/components/Markdown';
import privacidad from '@/legal/privacidad.md?raw';
import terminos from '@/legal/terminos.md?raw';

const TEXTOS = { terminos, privacidad };

/** /terminos y /privacidad: públicas, se pueden abrir desde el registro sin sesión. */
export function LegalPage({ documento }: { documento: keyof typeof TEXTOS }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh">
      <header className="bg-sidebar pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : void navigate('/'))}
            className="flex h-10 w-10 items-center justify-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/">
            <Logo fondo="oscuro" />
          </Link>
        </div>
        <div className="brand-bar h-0.5" aria-hidden />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Markdown texto={TEXTOS[documento]} />
      </main>
    </div>
  );
}
