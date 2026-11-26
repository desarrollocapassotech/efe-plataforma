import { formatearMoneda } from '@efe/shared/dinero';
import { rangoDePeriodo } from '@efe/shared/fechas';
import type { Movimiento, Transferencia } from '@efe/shared/schemas';
import { ArrowLeftRight, ListFilter, Loader2, Plus, Receipt, Repeat, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CurrencyAmount } from '@/components/CurrencyAmount';
import { Cargando, ErrorCarga, Vacio } from '@/components/Estados';
import { MesNavigator } from '@/components/MesNavigator';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { IconoCategoria } from '@/features/categorias/components/IconoCategoria';
import { useCategorias } from '@/features/categorias/hooks';
import { useCuentas } from '@/features/cuentas/hooks';
import { nombreDia, nombrePeriodo } from '@/lib/fechas-ui';
import { cn } from '@/lib/utils';
import { agruparPorDia, type ItemLista } from '../agrupar';
import { useCargaRapida } from '../carga-rapida-context';
import { FiltrosPanel } from '../components/FiltrosPanel';
import { aParametros, cantidadFiltros, leerFiltros, type FiltrosLista } from '../filtros';
import { useMovimientos, useTransferencias } from '../hooks';

export function MovimientosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filtros = leerFiltros(searchParams);
  const [verFiltros, setVerFiltros] = useState(false);
  const { abrir } = useCargaRapida();
  const cuentas = useCuentas();
  const categorias = useCategorias();

  const cambiar = (nuevos: FiltrosLista) => setSearchParams(aParametros(nuevos), { replace: true });
  const { desde, hasta } = rangoDePeriodo(filtros.mes);

  const verMovimientos = filtros.tipo !== 'TRANSFERENCIA';
  // Las transferencias no tienen categoría ni se buscan por texto.
  const verTransferencias =
    (!filtros.tipo || filtros.tipo === 'TRANSFERENCIA') && !filtros.categoriaId && !filtros.q;

  const movimientos = useMovimientos(
    {
      desde,
      hasta,
      tipo: filtros.tipo === 'TRANSFERENCIA' ? undefined : filtros.tipo,
      cuentaId: filtros.cuentaId,
      categoriaId: filtros.categoriaId,
      q: filtros.q,
    },
    verMovimientos,
  );
  const transferencias = useTransferencias(
    { desde, hasta, cuentaId: filtros.cuentaId },
    verTransferencias,
  );

  const cargandoMov = verMovimientos && movimientos.isPending;
  const cargandoTrf = verTransferencias && transferencias.isPending;
  const error =
    (verMovimientos && movimientos.error) || (verTransferencias && transferencias.error);

  const listaMov = verMovimientos ? (movimientos.data?.pages.flatMap((p) => p.items) ?? []) : [];
  const listaTrf = verTransferencias ? (transferencias.data ?? []) : [];
  const hayMas = verMovimientos && movimientos.hasNextPage;
  const dias = agruparPorDia(listaMov, listaTrf, hayMas ? listaMov.at(-1)?.fecha : undefined);

  // Scroll infinito: cuando el final de la lista entra en pantalla, se pide la página siguiente.
  const finalRef = useRef<HTMLDivElement>(null);
  const { fetchNextPage, isFetchingNextPage } = movimientos;
  useEffect(() => {
    const nodo = finalRef.current;
    if (!nodo || !hayMas) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    observador.observe(nodo);
    return () => observador.disconnect();
  }, [hayMas, isFetchingNextPage, fetchNextPage]);

  const nFiltros = cantidadFiltros(filtros);
  const chips = chipsDeFiltros(filtros, cuentas.data ?? [], categorias.data ?? []);

  return (
    <Pagina
      titulo="Movimientos"
      accion={
        <Button variant="outline" size="sm" onClick={() => setVerFiltros(true)}>
          <ListFilter /> Filtrar
          {nFiltros > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">
              {nFiltros}
            </span>
          )}
        </Button>
      }
    >
      <MesNavigator periodo={filtros.mes} onChange={(mes) => cambiar({ ...filtros, mes })} />

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Filtros activos">
          {chips.map((chip) => (
            <button
              key={chip.clave}
              type="button"
              onClick={() => cambiar({ ...filtros, ...chip.quitar })}
              className="flex h-8 items-center gap-1 rounded-full bg-primary/10 pl-3 pr-2 text-sm font-medium"
              aria-label={`Quitar filtro ${chip.texto}`}
            >
              {chip.texto}
              <X className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}

      {cargandoMov || cargandoTrf ? (
        <Cargando />
      ) : error ? (
        <ErrorCarga
          mensaje={error.message}
          onReintentar={() => {
            void movimientos.refetch();
            void transferencias.refetch();
          }}
        />
      ) : dias.length === 0 ? (
        <Vacio
          icono={Receipt}
          titulo={
            nFiltros > 0
              ? 'No hay nada con estos filtros'
              : `No cargaste nada en ${nombrePeriodo(filtros.mes).toLowerCase()}`
          }
          texto={
            nFiltros > 0
              ? 'Probá con otros filtros o con otro mes.'
              : 'Tocá + para cargar un gasto o un ingreso.'
          }
          accion={
            nFiltros > 0 ? (
              <Button variant="outline" onClick={() => cambiar({ mes: filtros.mes })}>
                Ver todo
              </Button>
            ) : (
              <Button onClick={() => abrir({ modo: 'nuevo', tipo: 'GASTO' })}>
                <Plus /> Cargar gasto
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-5">
          {dias.map((dia) => (
            <section key={dia.fecha} aria-label={nombreDia(dia.fecha)}>
              <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {nombreDia(dia.fecha)}
                </h2>
                <p className="text-right text-sm tabular-nums text-muted-foreground">
                  {dia.totales
                    .map((t) => formatearMoneda(t.neto, t.moneda, { signo: true }))
                    .join(' · ')}
                </p>
              </div>
              <ul className="divide-y overflow-hidden rounded-lg border bg-card">
                {dia.items.map((item) => (
                  <li
                    key={
                      item.clase === 'movimiento'
                        ? item.movimiento.id
                        : `t-${item.transferencia.id}`
                    }
                  >
                    <FilaItem
                      item={item}
                      onClick={() =>
                        item.clase === 'movimiento'
                          ? abrir({ modo: 'editar', movimiento: item.movimiento })
                          : abrir({ modo: 'transferencia', transferencia: item.transferencia })
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div ref={finalRef} />
          {hayMas && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage && <Loader2 className="animate-spin" />}
              {isFetchingNextPage ? 'Cargando…' : 'Ver más'}
            </Button>
          )}
        </div>
      )}

      <FiltrosPanel
        abierto={verFiltros}
        onCerrar={() => setVerFiltros(false)}
        filtros={filtros}
        cuentas={(cuentas.data ?? []).filter((c) => !c.archivada || c.id === filtros.cuentaId)}
        categorias={(categorias.data ?? []).filter(
          (c) => !c.archivada || c.id === filtros.categoriaId,
        )}
        onAplicar={cambiar}
      />
    </Pagina>
  );
}

function chipsDeFiltros(
  f: FiltrosLista,
  cuentas: { id: string; nombre: string }[],
  categorias: { id: string; nombre: string; icono: string }[],
) {
  const chips: { clave: string; texto: string; quitar: Partial<FiltrosLista> }[] = [];
  const tipos = { GASTO: 'Gastos', INGRESO: 'Ingresos', TRANSFERENCIA: 'Entre cuentas' };
  if (f.tipo) chips.push({ clave: 'tipo', texto: tipos[f.tipo], quitar: { tipo: undefined } });
  if (f.cuentaId) {
    const nombre = cuentas.find((c) => c.id === f.cuentaId)?.nombre ?? 'Cuenta';
    chips.push({ clave: 'cuenta', texto: nombre, quitar: { cuentaId: undefined } });
  }
  if (f.categoriaId) {
    const c = categorias.find((x) => x.id === f.categoriaId);
    chips.push({
      clave: 'categoria',
      texto: c ? `${c.icono} ${c.nombre}` : 'Categoría',
      quitar: { categoriaId: undefined },
    });
  }
  if (f.q) chips.push({ clave: 'q', texto: `"${f.q}"`, quitar: { q: undefined } });
  return chips;
}

function FilaItem({ item, onClick }: { item: ItemLista; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-accent"
    >
      {item.clase === 'movimiento' ? (
        <ContenidoMovimiento m={item.movimiento} />
      ) : (
        <ContenidoTransferencia t={item.transferencia} />
      )}
    </button>
  );
}

function ContenidoMovimiento({ m }: { m: Movimiento }) {
  const titulo = m.descripcion || m.categoria?.nombre || 'Sin categoría';
  const detalle = [m.descripcion ? m.categoria?.nombre : null, m.cuenta.nombre]
    .filter(Boolean)
    .join(' · ');
  const provisorio = m.id.startsWith('provisorio-');
  return (
    <>
      {m.categoria ? (
        <IconoCategoria icono={m.categoria.icono} color={m.categoria.color} tamano="sm" />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg"
          aria-hidden
        >
          {m.tipo === 'GASTO' ? '🧾' : '💰'}
        </span>
      )}
      <span className={cn('min-w-0 flex-1', provisorio && 'opacity-60')}>
        <span className="block truncate font-medium">{titulo}</span>
        <span className="flex items-center gap-1 truncate text-sm text-muted-foreground">
          {m.recurrenciaId && <Repeat className="h-3.5 w-3.5 shrink-0" aria-label="Se repite" />}
          {detalle}
        </span>
      </span>
      <CurrencyAmount
        valor={m.tipo === 'GASTO' ? `-${m.monto}` : m.monto}
        moneda={m.moneda}
        className={cn('font-semibold', m.tipo === 'INGRESO' && 'text-success')}
      />
    </>
  );
}

function ContenidoTransferencia({ t }: { t: Transferencia }) {
  return (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        aria-hidden
      >
        <ArrowLeftRight className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{t.descripcion || 'Entre tus cuentas'}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {t.cuentaOrigen.nombre} → {t.cuentaDestino.nombre}
        </span>
      </span>
      <span className="text-right">
        <CurrencyAmount
          valor={t.montoOrigen}
          moneda={t.cuentaOrigen.moneda}
          className="block font-medium text-muted-foreground"
        />
        {t.cotizacion && (
          <CurrencyAmount
            valor={t.montoDestino}
            moneda={t.cuentaDestino.moneda}
            className="block text-xs text-muted-foreground"
          />
        )}
      </span>
    </>
  );
}
