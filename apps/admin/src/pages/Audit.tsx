import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, Search } from 'lucide-react';
import type { AuditoriaItem, PaginaAdmin } from '@efe/shared/schemas';
import { PageHeader } from '@/components/PageHeader';
import { SortableHead, type SortDirection } from '@/components/SortableHead';
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
  Paginacion,
  Seccion,
  type FiltroAplicado,
} from '@/components/plataforma/comunes';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiEfe, query } from '@/lib/api-efe';

/** Nombre legible de cada acción auditada (las nuevas se muestran con su código). */
const ACCIONES: Record<string, string> = {
  'admin.cambiar_plan': 'Cambio de plan',
  'admin.corregir_indicador': 'Corrección de indicador',
};
const nombreAccion = (a: string) => ACCIONES[a] ?? a;

const AccionBadge = ({ accion }: { accion: string }) => (
  <Badge
    variant="outline"
    className="w-44 justify-center border-primary/20 bg-primary/5 text-primary"
  >
    {nombreAccion(accion)}
  </Badge>
);

const ALL = '__all__';
type Filtros = { accion: string; desde: string; hasta: string };
const VACIOS: Filtros = { accion: ALL, desde: '', hasta: '' };

/** Registro de acciones sensibles (cambios de plan, correcciones, y lo que se sume en 7.1). */
export const Audit = () => {
  const isMobile = useIsMobile();
  const [borrador, setBorrador] = useState<Filtros>(VACIOS);
  const [aplicados, setAplicados] = useState<Filtros>(VACIOS);
  const [dir, setDir] = useState<SortDirection>('desc');
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<AuditoriaItem | null>(null);

  const auditoria = useQuery({
    queryKey: ['admin', 'auditoria', aplicados, dir, pagina],
    queryFn: () =>
      apiEfe<PaginaAdmin<AuditoriaItem>>(
        `/admin/auditoria${query({
          accion: aplicados.accion === ALL ? undefined : aplicados.accion,
          desde: aplicados.desde,
          hasta: aplicados.hasta,
          dir,
          pagina,
          limite: 25,
        })}`,
      ),
    placeholderData: keepPreviousData,
  });

  const quitar = (key: string) => {
    const k = key as keyof Filtros;
    setAplicados((p) => ({ ...p, [k]: VACIOS[k] }));
    setBorrador((p) => ({ ...p, [k]: VACIOS[k] }));
    setPagina(1);
  };
  const filtros = [
    aplicados.accion !== ALL && {
      key: 'accion',
      label: 'Acción',
      value: nombreAccion(aplicados.accion),
    },
    aplicados.desde && { key: 'desde', label: 'Desde', value: fechaCorta(aplicados.desde) },
    aplicados.hasta && { key: 'hasta', label: 'Hasta', value: fechaCorta(aplicados.hasta) },
  ].filter(Boolean) as FiltroAplicado[];
  const datos = auditoria.data;
  const invertir = () => {
    setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    setPagina(1);
  };
  const ver = (a: AuditoriaItem) => (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDetalle(a)}
        title="Ver detalle"
        aria-label="Ver detalle"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Auditoría' }]}
        title="Auditoría"
        description="Quién hizo qué y cuándo en la plataforma."
      />

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAplicados(borrador);
              setPagina(1);
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="aud-accion" className="eyebrow">
                Acción
              </Label>
              <Select
                value={borrador.accion}
                onValueChange={(v) => setBorrador((p) => ({ ...p, accion: v }))}
              >
                <SelectTrigger id="aud-accion" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {Object.entries(ACCIONES).map(([codigo, nombre]) => (
                    <SelectItem key={codigo} value={codigo}>
                      {nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aud-desde" className="eyebrow">
                Desde
              </Label>
              <Input
                id="aud-desde"
                type="date"
                value={borrador.desde}
                onChange={(e) => setBorrador((p) => ({ ...p, desde: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aud-hasta" className="eyebrow">
                Hasta
              </Label>
              <Input
                id="aud-hasta"
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
              setPagina(1);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros ({datos?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <EstadoListado
            cargando={auditoria.isPending}
            error={auditoria.error}
            vacio={(datos?.items.length ?? 0) === 0}
            textoVacio={
              filtros.length > 0 ? 'No hay registros con estos filtros' : 'Todavía no hay registros'
            }
            onReintentar={() => void auditoria.refetch()}
          >
            {isMobile ? (
              <div className="space-y-4">
                <Button variant="outline" size="sm" onClick={invertir} className="w-full">
                  {dir === 'desc' ? (
                    <ArrowDown className="mr-2 h-4 w-4" />
                  ) : (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  )}
                  {dir === 'desc' ? 'Más nuevos primero' : 'Más viejos primero'}
                </Button>
                {datos?.items.map((a) => (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {fechaHora(a.creadoEn)}
                        </span>
                        <AccionBadge accion={a.accion} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="truncate">
                        <strong>Por:</strong> {a.actor?.email ?? 'Sistema'}
                      </div>
                      {a.usuario && (
                        <div className="truncate">
                          <strong>Usuario:</strong> {a.usuario.email}
                        </div>
                      )}
                      <div className="pt-2">{ver(a)}</div>
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
                        activeKey="fecha"
                        direction={dir}
                        onSort={invertir}
                      />
                      <TableHead>Acción</TableHead>
                      <TableHead>Hecho por</TableHead>
                      <TableHead>Usuario afectado</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={auditoria.isPlaceholderData ? 'opacity-60' : undefined}>
                    {datos?.items.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {fechaHora(a.creadoEn)}
                        </TableCell>
                        <TableCell>
                          <AccionBadge accion={a.accion} />
                        </TableCell>
                        <TableCell className="text-sm">{a.actor?.email ?? 'Sistema'}</TableCell>
                        <TableCell className="text-sm">
                          {a.usuario?.email ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.entidad}</TableCell>
                        <TableCell>{ver(a)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {datos && (
              <Paginacion
                pagina={datos.pagina}
                limite={datos.limite}
                total={datos.total}
                onCambiar={setPagina}
              />
            )}
          </EstadoListado>
        </CardContent>
      </Card>

      <Sheet open={Boolean(detalle)} onOpenChange={(o) => !o && setDetalle(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {detalle && (
            <div className="space-y-5">
              <SheetHeader className="space-y-2 text-left">
                <AccionBadge accion={detalle.accion} />
                <SheetTitle className="font-display text-xl">
                  {nombreAccion(detalle.accion)}
                </SheetTitle>
                <SheetDescription>{fechaHora(detalle.creadoEn)}</SheetDescription>
              </SheetHeader>
              <Seccion titulo="Quién y sobre qué">
                <Dato label="Hecho por">{detalle.actor?.email ?? 'Sistema'}</Dato>
                <Dato label="Usuario afectado">{detalle.usuario?.email ?? '—'}</Dato>
                <Dato label="Entidad">
                  {detalle.entidad}
                  {detalle.entidadId && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {detalle.entidadId}
                    </span>
                  )}
                </Dato>
                <Dato label="IP">{detalle.ip ?? '—'}</Dato>
              </Seccion>
              <Seccion titulo="Datos">
                <pre className="overflow-x-auto border border-border bg-muted p-3 text-xs">
                  {JSON.stringify(detalle.datos, null, 2)}
                </pre>
              </Seccion>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
