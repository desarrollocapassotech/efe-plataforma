import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { CargaRapidaProvider } from '@/features/movimientos/components/CargaRapida';
import { cn } from '@/lib/utils';
import { NAVEGACION } from './navegacion';

/**
 * Layout de la zona privada (mobile-first):
 * - Móvil: barra superior azul con el logo + barra de navegación inferior fija.
 * - Desktop (lg): sidebar azul a la izquierda con el logo y las secciones.
 * - Siempre: botón flotante "+" de carga rápida (CargaRapidaProvider).
 */
export function AppLayout() {
  return (
    <CargaRapidaProvider>
      <div className="min-h-dvh lg:flex">
        {/* Sidebar desktop */}
        <aside className="hidden w-60 shrink-0 flex-col bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh">
          <div className="px-5 pb-4 pt-6">
            <Logo fondo="oscuro" />
          </div>
          <div className="brand-bar mx-5 h-0.5" aria-hidden />
          <nav className="mt-4 flex flex-col gap-1 px-3" aria-label="Secciones">
            {NAVEGACION.map(({ ruta, etiqueta, icono: Icono }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end={ruta === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-gold-light'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icono className={cn('h-4 w-4', isActive && 'text-gold-light')} />
                    {etiqueta}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barra superior móvil */}
          <header className="sticky top-0 z-30 bg-sidebar pt-[env(safe-area-inset-top)] lg:hidden">
            <div className="flex h-14 items-center px-4">
              <Logo fondo="oscuro" />
            </div>
            <div className="brand-bar h-0.5" aria-hidden />
          </header>

          {/* Contenido: deja lugar a la barra inferior y al botón "+" (que no tape lo último). */}
          <main className="flex-1 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-28">
            <Outlet />
          </main>

          {/* Barra de navegación inferior móvil */}
          <nav
            className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
            aria-label="Secciones"
          >
            <ul className="grid grid-cols-5">
              {NAVEGACION.map(({ ruta, etiqueta, icono: Icono }) => (
                <li key={ruta}>
                  <NavLink
                    to={ruta}
                    end={ruta === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icono className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                        {etiqueta}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </CargaRapidaProvider>
  );
}
