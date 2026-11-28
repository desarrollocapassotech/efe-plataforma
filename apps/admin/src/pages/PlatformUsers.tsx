import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, Search } from 'lucide-react';
import type { PaginaAdmin, UsuarioAdmin } from '@efe/shared/schemas';
import type { Plan } from '@efe/shared/features';
import { SuscripcionIcon } from '@/components/icons/SuscripcionIcon';
import { PageHeader } from '@/components/PageHeader';
import { SortableHead, type SortDirection } from '@/components/SortableHead';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  EstadoListado,
  fechaCorta,
  FiltrosAplicados,
  Paginacion,
  type FiltroAplicado,
} from '@/components/plataforma/comunes';
import {
  CambiarPlanDialog,
  NOMBRE_PLAN,
  PlanBadge,
  UsuarioPlataformaSheet,
} from '@/components/plataforma/UsuarioPlataformaSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiEfe, query } from '@/lib/api-efe';

const ALL = '__all__';
type Filtros = {
  q: string;
  plan: string;
  rol: string;
  actividad: string;
  desde: string;
  hasta: string;
};
const VACIOS: Filtros = { q: '', plan: ALL, rol: ALL, actividad: ALL, desde: '', hasta: '' };

const ACTIVIDAD = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

type Orden = 'creadoEn' | 'ultimoAccesoEn' | 'email' | 'nombre' | 'plan';
const ETIQUETA_ORDEN: Record<Orden, string> = {
  creadoEn: 'Registro',
  ultimoAccesoEn: 'Último acceso',
  email: 'Email',
  nombre: 'Nombre',
  plan: 'Plan',
};

/** Usuarios de la app web (Postgres, vía la API). No confundir con Clientes (Firestore). */
export const PlatformUsers = () => {
  const isMobile = useIsMobile();
  const [borrador, setBorrador] = useState<Filtros>(VACIOS);
  const [aplicados, setAplicados] = useState<Filtros>(VACIOS);
  const [orden, setOrden] = useState<Orden>('creadoEn');
  const [dir, setDir] = useState<SortDirection>('desc');
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<UsuarioAdmin | null>(null);
  const [cambiarPlan, setCambiarPlan] = useState<UsuarioAdmin | null>(null);

  const usuarios = useQuery({
    queryKey: ['admin', 'usuarios', aplicados, orden, dir, pagina],
    queryFn: () =>
      apiEfe<PaginaAdmin<UsuarioAdmin>>(
        `/admin/usuarios${query({
          q: aplicados.q.trim(),
          plan: aplicados.plan === ALL ? undefined : aplicados.plan,
          rol: aplicados.rol === ALL ? undefined : aplicados.rol,
          activoDias: aplicados.actividad === ALL ? undefined : aplicados.actividad,
          desde: aplicados.desde,
          hasta: aplicados.hasta,
          orden,
          dir,
          pagina,
          limite: 25,
        })}`,
      ),
    placeholderData: keepPreviousData,
  });

  const buscar = (e?: React.FormEvent) => {
    e?.preventDefault();
    setAplicados(borrador);
    setPagina(1);
  };
  const quitar = (key: string) => {
    const k = key as keyof Filtros;
    setAplicados((p) => ({ ...p, [k]: VACIOS[k] }));
    setBorrador((p) => ({ ...p, [k]: VACIOS[k] }));
    setPagina(1);
  };
  const ordenar = (key: Orden) => {
    if (key === orden) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setOrden(key);
      // Fechas arrancan por la más reciente; textos, A→Z.
      setDir(key === 'creadoEn' || key === 'ultimoAccesoEn' ? 'desc' : 'asc');
    }
    setPagina(1);
  };

  const filtros = [
    aplicados.q.trim() && { key: 'q', label: 'Buscar', value: aplicados.q.trim() },
    aplicados.plan !== ALL && {
      key: 'plan',
      label: 'Plan',
      value: NOMBRE_PLAN[aplicados.plan as Plan],
    },
    aplicados.rol !== ALL && {
      key: 'rol',
      label: 'Rol',
      value: aplicados.rol === 'ADMIN' ? 'Admin' : 'Usuario',
    },
    aplicados.actividad !== ALL && {
      key: 'actividad',
      label: 'Activos',
      value: ACTIVIDAD.find((a) => a.value === aplicados.actividad)?.label ?? '',
    },
    aplicados.desde && {
      key: 'desde',
      label: 'Registrado desde',
      value: fechaCorta(aplicados.desde),
    },
    aplicados.hasta && {
      key: 'hasta',
      label: 'Registrado hasta',
      value: fechaCorta(aplicados.hasta),
    },
  ].filter(Boolean) as FiltroAplicado[];

  const datos = usuarios.data;
  const acciones = (u: UsuarioAdmin) => (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDetalle(u)}
        title="Ver detalle"
        aria-label={`Ver detalle de ${u.email}`}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setCambiarPlan(u)}
        title="Cambiar plan"
        aria-label={`Cambiar plan de ${u.email}`}
      >
        <SuscripcionIcon className="h-4 w-4" />
      </Button>
    </div>
  );
  const marcas = (u: UsuarioAdmin) => (
    <>
      {u.rol === 'ADMIN' && (
        <span className="border border-gold/30 bg-gold/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider">
          Admin
        </span>
      )}
      {u.eliminadoEn && (
        <span className="border border-destructive/20 bg-destructive/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-destructive">
          Baja
        </span>
      )}
    </>
  );

  return (
    <div className="flex-1 space-y-4 p-3 pt-16 sm:space-y-6 sm:p-6 lg:pt-6">
      <PageHeader
        breadcrumbs={[{ label: 'Usuarios plataforma' }]}
        title="Usuarios de la plataforma"
        description="Quienes usan la app web de EFE. Los clientes de asesoramiento están en Clientes."
      />

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <form
            onSubmit={buscar}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="pu-q" className="eyebrow">
                Email o nombre
              </Label>
              <Input
                id="pu-q"
                value={borrador.q}
                onChange={(e) => setBorrador((p) => ({ ...p, q: e.target.value }))}
                placeholder="Buscar…"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu-plan" className="eyebrow">
                Plan
              </Label>
              <Select
                value={borrador.plan}
                onValueChange={(v) => setBorrador((p) => ({ ...p, plan: v }))}
              >
                <SelectTrigger id="pu-plan" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {(Object.keys(NOMBRE_PLAN) as Plan[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {NOMBRE_PLAN[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu-rol" className="eyebrow">
                Rol
              </Label>
              <Select
                value={borrador.rol}
                onValueChange={(v) => setBorrador((p) => ({ ...p, rol: v }))}
              >
                <SelectTrigger id="pu-rol" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="USUARIO">Usuario</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu-actividad" className="eyebrow">
                Activos
              </Label>
              <Select
                value={borrador.actividad}
                onValueChange={(v) => setBorrador((p) => ({ ...p, actividad: v }))}
              >
                <SelectTrigger id="pu-actividad" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Cualquier momento</SelectItem>
                  {ACTIVIDAD.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu-desde" className="eyebrow">
                Registrado desde
              </Label>
              <Input
                id="pu-desde"
                type="date"
                value={borrador.desde}
                onChange={(e) => setBorrador((p) => ({ ...p, desde: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu-hasta" className="eyebrow">
                Hasta
              </Label>
              <Input
                id="pu-hasta"
                type="date"
                value={borrador.hasta}
                onChange={(e) => setBorrador((p) => ({ ...p, hasta: e.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
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
          <CardTitle>Usuarios ({datos?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <EstadoListado
            cargando={usuarios.isPending}
            error={usuarios.error}
            vacio={(datos?.items.length ?? 0) === 0}
            textoVacio={
              filtros.length > 0
                ? 'No hay usuarios con estos filtros'
                : 'Todavía no hay usuarios registrados'
            }
            onReintentar={() => void usuarios.refetch()}
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
                      {(Object.keys(ETIQUETA_ORDEN) as Orden[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {ETIQUETA_ORDEN[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => ordenar(orden)}
                    aria-label={dir === 'asc' ? 'Orden ascendente' : 'Orden descendente'}
                    title={dir === 'asc' ? 'Ascendente' : 'Descendente'}
                  >
                    {dir === 'asc' ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {datos?.items.map((u) => (
                  <Card key={u.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 font-medium">
                          <span className="truncate">{u.nombre ?? u.email}</span>
                          {marcas(u)}
                        </div>
                        <PlanBadge plan={u.plan} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="truncate text-muted-foreground">{u.email}</div>
                      <div>
                        <strong>Registro:</strong> {fechaCorta(u.creadoEn)}
                      </div>
                      <div>
                        <strong>Último acceso:</strong> {fechaCorta(u.ultimoAccesoEn)}
                      </div>
                      <div>
                        <strong>Movimientos:</strong> {u.movimientos}
                      </div>
                      <div className="pt-2">{acciones(u)}</div>
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
                        label="Registro"
                        sortKey="creadoEn"
                        activeKey={orden}
                        direction={dir}
                        onSort={ordenar}
                      />
                      <SortableHead
                        label="Email"
                        sortKey="email"
                        activeKey={orden}
                        direction={dir}
                        onSort={ordenar}
                      />
                      <SortableHead
                        label="Nombre"
                        sortKey="nombre"
                        activeKey={orden}
                        direction={dir}
                        onSort={ordenar}
                      />
                      <SortableHead
                        label="Plan"
                        sortKey="plan"
                        activeKey={orden}
                        direction={dir}
                        onSort={ordenar}
                      />
                      <SortableHead
                        label="Último acceso"
                        sortKey="ultimoAccesoEn"
                        activeKey={orden}
                        direction={dir}
                        onSort={ordenar}
                      />
                      <TableHead className="text-right">Movimientos</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className={usuarios.isPlaceholderData ? 'opacity-60' : undefined}>
                    {datos?.items.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {fechaCorta(u.creadoEn)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            {u.email}
                            {marcas(u)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {u.nombre ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <PlanBadge plan={u.plan} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                          {fechaCorta(u.ultimoAccesoEn)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{u.movimientos}</TableCell>
                        <TableCell>{acciones(u)}</TableCell>
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

      <UsuarioPlataformaSheet
        usuario={detalle}
        onOpenChange={(open) => !open && setDetalle(null)}
        onCambiarPlan={(u) => {
          setDetalle(null);
          setCambiarPlan(u);
        }}
      />
      <CambiarPlanDialog
        usuario={cambiarPlan}
        onOpenChange={(open) => !open && setCambiarPlan(null)}
      />
    </div>
  );
};
