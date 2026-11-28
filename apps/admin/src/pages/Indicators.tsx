import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { CODIGOS_INDICADOR, FUENTE_MANUAL, type CodigoIndicador } from '@efe/shared/indicadores';
import type { IndicadorAdmin } from '@efe/shared/schemas';
import { PageHeader } from '@/components/PageHeader';
import { SortableHead, type SortDirection } from '@/components/SortableHead';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dato,
  EstadoListado,
  fechaCorta,
  fechaHora,
  FiltrosAplicados,
  Seccion,
  type FiltroAplicado,
} from '@/components/plataforma/comunes';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiEfe, query } from '@/lib/api-efe';

export const NOMBRE_INDICADOR: Record<CodigoIndicador, string> = {
  DOLAR_OFICIAL_COMPRA: 'Dólar oficial · compra',
  DOLAR_OFICIAL_VENTA: 'Dólar oficial · venta',
  DOLAR_MEP_COMPRA: 'Dólar MEP · compra',
  DOLAR_MEP_VENTA: 'Dólar MEP · venta',
  DOLAR_CCL_COMPRA: 'Dólar CCL · compra',
  DOLAR_CCL_VENTA: 'Dólar CCL · venta',
  IPC_MENSUAL: 'Inflación mensual (IPC)',
};

const valorVisible = (i: Pick<IndicadorAdmin, 'codigo' | 'valor'>) =>
  i.codigo === 'IPC_MENSUAL'
    ? `${i.valor.replace('.', ',')} %`
    : `$ ${Number(i.valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FuenteBadge = ({ fuente }: { fuente: string }) =>
  fuente === FUENTE_MANUAL ? (
    <Badge
      variant="outline"
      className="w-24 justify-center border-gold/30 bg-gold/10 text-foreground"
    >
      Manual
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="w-24 justify-center border-border bg-muted text-muted-foreground"
    >
      Automático
    </Badge>
  );

const ALL = '__all__';
type Filtros = { codigo: string; desde: string; hasta: string };
const VACIOS: Filtros = { codigo: ALL, desde: '', hasta: '' };
type Orden = 'fecha' | 'codigo';

/** Valores guardados de los indicadores y corrección manual (auditada; la ingesta no la pisa). */
export const Indicators = () => {
  const isMobile = useIsMobile();
  const [borrador, setBorrador] = useState<Filtros>(VACIOS);
  const [aplicados, setAplicados] = useState<Filtros>(VACIOS);
  const [orden, setOrden] = useState<Orden>('fecha');
  const [dir, setDir] = useState<SortDirection>('desc');
  const [detalle, setDetalle] = useState<IndicadorAdmin | null>(null);
  const [corregir, setCorregir] = useState<Partial<IndicadorAdmin> | null>(null);

  const indicadores = useQuery({
    queryKey: ['admin', 'indicadores', aplicados],
    queryFn: () =>
      apiEfe<IndicadorAdmin[]>(
        `/admin/indicadores${query({
          codigo: aplicados.codigo === ALL ? undefined : aplicados.codigo,
          desde: aplicados.desde,
          hasta: aplicados.hasta,
        })}`,
      ),
  });

  const ordenados = useMemo(() => {
    const f = dir === 'asc' ? 1 : -1;
    return [...(indicadores.data ?? [])].sort(
      (a, b) =>
        (orden === 'fecha' ? a.fecha.localeCompare(b.fecha) : a.codigo.localeCompare(b.codigo)) *
          f || a.codigo.localeCompare(b.codigo),
    );
  }, [indicadores.data, orden, dir]);

  const ordenar = (k: Orden) => {
    if (k === orden) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setOrden(k);
      setDir(k === 'fecha' ? 'desc' : 'asc');
    }
  };
  const quitar = (key: string) => {
    const k = key as keyof Filtros;
    setAplicados((p) => ({ ...p, [k]: VACIOS[k] }));
    setBorrador((p) => ({ ...p, [k]: VACIOS[k] }));
  };
  const filtros = [
    aplicados.codigo !== ALL && {
      key: 'codigo',
      label: 'Indicador',
      value: NOMBRE_INDICADOR[aplicados.codigo as CodigoIndicador],
    },
    aplicados.desde && { key: 'desde', label: 'Desde', value: fechaCorta(aplicados.desde) },
    aplicados.hasta && { key: 'hasta', label: 'Hasta', value: fechaCorta(aplicados.hasta) },
  ].filter(Boolean) as FiltroAplicado[];

  const acciones = (i: IndicadorAdmin) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDetalle(i)}
        title="Ver detalle"
        aria-label="Ver detalle"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCorregir(i)}
        title="Corregir valor"
        aria-label="Corregir valor"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Indicadores' }]}
        title="Indicadores económicos"
        description="Dólares e inflación que muestra la app. Se actualizan solos; acá se corrige un valor si una fuente se equivoca."
        actions={
          <Button className="w-full sm:w-auto" onClick={() => setCorregir({})}>
            <Plus className="mr-2 h-4 w-4" />
            Cargar valor
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAplicados(borrador);
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="ind-codigo" className="eyebrow">
                Indicador
              </Label>
              <Select
                value={borrador.codigo}
                onValueChange={(v) => setBorrador((p) => ({ ...p, codigo: v }))}
              >
                <SelectTrigger id="ind-codigo" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {CODIGOS_INDICADOR.map((c) => (
                    <SelectItem key={c} value={c}>
                      {NOMBRE_INDICADOR[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ind-desde" className="eyebrow">
                Desde
              </Label>
              <Input
                id="ind-desde"
                type="date"
                value={borrador.desde}
                onChange={(e) => setBorrador((p) => ({ ...p, desde: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ind-hasta" className="eyebrow">
                Hasta
              </Label>
              <Input
                id="ind-hasta"
                type="date"
                value={borrador.hasta}
                onChange={(e) => setBorrador((p) => ({ ...p, hasta: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full sm:col-span-3 lg:col-span-1 lg:w-auto">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </form>
          <FiltrosAplicados
            filtros={filtros}
            onQuitar={quitar}
            onLimpiar={() => {
              setAplicados(VACIOS);
              setBorrador(VACIOS);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores ({ordenados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <EstadoListado
            cargando={indicadores.isPending}
            error={indicadores.error}
            vacio={ordenados.length === 0}
            textoVacio={
              filtros.length > 0
                ? 'No hay valores con estos filtros'
                : 'Todavía no se cargó ningún indicador'
            }
            onReintentar={() => void indicadores.refetch()}
          >
            {isMobile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Select value={orden} onValueChange={(v) => ordenar(v as Orden)}>
                    <SelectTrigger className="h-9 flex-1 text-sm" aria-label="Ordenar por">
                      <span className="mr-1 text-muted-foreground">Ordenar por:</span>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fecha">Fecha</SelectItem>
                      <SelectItem value="codigo">Indicador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => ordenar(orden)}
                    aria-label="Invertir orden"
                    title="Invertir orden"
                  >
                    {dir === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {ordenados.map((i) => (
                  <Card key={i.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{NOMBRE_INDICADOR[i.codigo]}</span>
                        <FuenteBadge fuente={i.fuente} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div>
                        <strong>Fecha:</strong> {fechaCorta(i.fecha)}
                      </div>
                      <div>
                        <strong>Valor:</strong> {valorVisible(i)}
                      </div>
                      <div className="pt-2">{acciones(i)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHead
                        label="Fecha"
                        sortKey="fecha"
                        activeKey={orden}
                        direction={dir}
                        onSort={ordenar}
                      />
                      <SortableHead
                        label="Indicador"
                        sortKey="codigo"
                        activeKey={orden}
                        direction={dir}
                        onSort={ordenar}
                      />
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordenados.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {fechaCorta(i.fecha)}
                        </TableCell>
                        <TableCell className="font-medium">{NOMBRE_INDICADOR[i.codigo]}</TableCell>
                        <TableCell className="text-right tabular-nums">{valorVisible(i)}</TableCell>
                        <TableCell>
                          <FuenteBadge fuente={i.fuente} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{i.fuente}</TableCell>
                        <TableCell>{acciones(i)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </EstadoListado>
        </CardContent>
      </Card>

      <Sheet open={Boolean(detalle)} onOpenChange={(o) => !o && setDetalle(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {detalle && (
            <div className="space-y-5">
              <SheetHeader className="space-y-2 text-left">
                <FuenteBadge fuente={detalle.fuente} />
                <SheetTitle className="font-display text-xl">
                  {NOMBRE_INDICADOR[detalle.codigo]}
                </SheetTitle>
                <SheetDescription>Dato del {fechaCorta(detalle.fecha)}</SheetDescription>
              </SheetHeader>
              <Seccion titulo="Valor">
                <Dato label="Valor">{valorVisible(detalle)}</Dato>
                <Dato label="Valor guardado">{detalle.valor}</Dato>
              </Seccion>
              <Seccion titulo="Procedencia">
                <Dato label="Fuente">{detalle.fuente}</Dato>
                <Dato label="URL">
                  {detalle.urlFuente ? (
                    <a
                      href={detalle.urlFuente}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {detalle.urlFuente}
                    </a>
                  ) : (
                    '—'
                  )}
                </Dato>
                <Dato label="Obtenido">{fechaHora(detalle.obtenidoEn)}</Dato>
              </Seccion>
              <div className="flex justify-end border-t border-border pt-5">
                <Button
                  onClick={() => {
                    setCorregir(detalle);
                    setDetalle(null);
                  }}
                >
                  Corregir valor
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={corregir !== null} onOpenChange={(o) => !o && setCorregir(null)}>
        <AlertDialogContent>
          {corregir && (
            <FormularioCorreccion inicial={corregir} onListo={() => setCorregir(null)} />
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const FormularioCorreccion = ({
  inicial,
  onListo,
}: {
  inicial: Partial<IndicadorAdmin>;
  onListo: () => void;
}) => {
  const [codigo, setCodigo] = useState<CodigoIndicador>(inicial.codigo ?? 'DOLAR_MEP_VENTA');
  const [fecha, setFecha] = useState(inicial.fecha ?? '');
  const [valor, setValor] = useState(inicial.valor ?? '');
  const queryClient = useQueryClient();
  const valorNormalizado = valor.trim().replace(',', '.');
  const valido =
    /^-?\d{1,12}(\.\d{1,6})?$/.test(valorNormalizado) && /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const guardar = useMutation({
    mutationFn: () =>
      apiEfe<IndicadorAdmin>('/admin/indicadores', {
        method: 'PUT',
        body: { codigo, fecha, valor: valorNormalizado },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'indicadores'] });
      toast({
        title: 'Valor guardado',
        description: `${NOMBRE_INDICADOR[codigo]} del ${fechaCorta(fecha)}`,
      });
      onListo();
    },
    onError: (e: Error) =>
      toast({ title: 'No se pudo guardar', description: e.message, variant: 'destructive' }),
  });

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{inicial.id ? 'Corregir valor' : 'Cargar valor'}</AlertDialogTitle>
        <AlertDialogDescription>
          Queda como "Carga manual EFE", se registra en la auditoría y la actualización automática
          ya no lo reemplaza. Para la inflación, el valor va en % (ej. 2.7) y la fecha es el primer
          día del mes.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="corr-codigo" className="eyebrow">
            Indicador
          </Label>
          <Select
            value={codigo}
            onValueChange={(v) => setCodigo(v as CodigoIndicador)}
            disabled={Boolean(inicial.id)}
          >
            <SelectTrigger id="corr-codigo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODIGOS_INDICADOR.map((c) => (
                <SelectItem key={c} value={c}>
                  {NOMBRE_INDICADOR[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="corr-fecha" className="eyebrow">
              Fecha del dato
            </Label>
            <Input
              id="corr-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={Boolean(inicial.id)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="corr-valor" className="eyebrow">
              Valor
            </Label>
            <Input
              id="corr-valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Ej. 1180.50"
            />
          </div>
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          disabled={!valido || guardar.isPending}
          onClick={(e) => {
            e.preventDefault();
            guardar.mutate();
          }}
        >
          {guardar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};
