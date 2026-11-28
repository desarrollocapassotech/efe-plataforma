import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { UsuarioAdmin, UsuarioAdminDetalle } from '@efe/shared/schemas';
import type { Plan } from '@efe/shared/features';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { apiEfe } from '@/lib/api-efe';
import { Dato, fechaHora, Seccion } from './comunes';

export const NOMBRE_PLAN: Record<Plan, string> = {
  FREE: 'Gratis',
  PREMIUM: 'Premium',
  ASESORAMIENTO: 'Asesoramiento',
};

const COLOR_PLAN: Record<Plan, string> = {
  FREE: 'border-border bg-muted text-muted-foreground',
  PREMIUM: 'border-gold/30 bg-gold/10 text-foreground',
  ASESORAMIENTO: 'border-primary/20 bg-primary/10 text-primary',
};

/** Plan como badge de ancho fijo (patrón de listados). */
export const PlanBadge = ({ plan }: { plan: Plan }) => (
  <Badge variant="outline" className={`w-28 justify-center ${COLOR_PLAN[plan]}`}>
    {NOMBRE_PLAN[plan]}
  </Badge>
);

/** Panel lateral de un usuario de la plataforma: solo contadores, nunca montos. */
export const UsuarioPlataformaSheet = ({
  usuario,
  onOpenChange,
  onCambiarPlan,
}: {
  usuario: UsuarioAdmin | null;
  onOpenChange: (open: boolean) => void;
  onCambiarPlan: (usuario: UsuarioAdmin) => void;
}) => {
  const detalle = useQuery({
    queryKey: ['admin', 'usuarios', usuario?.id],
    queryFn: () => apiEfe<UsuarioAdminDetalle>(`/admin/usuarios/${usuario!.id}`),
    enabled: Boolean(usuario),
  });
  const d = detalle.data;

  return (
    <Sheet open={Boolean(usuario)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {usuario && (
          <div className="space-y-5">
            <SheetHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <PlanBadge plan={usuario.plan} />
                {usuario.rol === 'ADMIN' && (
                  <Badge variant="outline" className="border-gold/30 bg-gold/10 text-foreground">
                    Admin
                  </Badge>
                )}
                {usuario.eliminadoEn && (
                  <Badge
                    variant="outline"
                    className="border-destructive/20 bg-destructive/10 text-destructive"
                  >
                    Baja solicitada
                  </Badge>
                )}
              </div>
              <SheetTitle className="font-display text-xl">
                {usuario.nombre ?? usuario.email}
              </SheetTitle>
              <SheetDescription>
                {usuario.nombre ? usuario.email : 'Sin nombre cargado'}
              </SheetDescription>
            </SheetHeader>

            <Seccion titulo="Cuenta">
              <Dato label="Registrado">{fechaHora(usuario.creadoEn)}</Dato>
              <Dato label="Último acceso">{fechaHora(usuario.ultimoAccesoEn)}</Dato>
              <Dato label="Onboarding">
                {usuario.onboardingCompletado ? 'Completo' : 'Sin terminar'}
              </Dato>
              {d && (
                <Dato label="Moneda principal">
                  {d.monedaPrincipal === 'ARS' ? 'Pesos' : 'Dólares'}
                </Dato>
              )}
              {usuario.eliminadoEn && (
                <Dato label="Baja solicitada">{fechaHora(usuario.eliminadoEn)}</Dato>
              )}
            </Seccion>

            <Seccion titulo="Uso de la plataforma">
              {detalle.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : d ? (
                <>
                  <Dato label="Cuentas">{d.contadores.cuentas}</Dato>
                  <Dato label="Movimientos">{d.contadores.movimientos}</Dato>
                  <Dato label="Recurrentes">{d.contadores.recurrencias}</Dato>
                  <Dato label="Tarjetas">{d.contadores.tarjetas}</Dato>
                  <Dato label="Compras con tarjeta">{d.contadores.compras}</Dato>
                  <Dato label="Objetivos">{d.contadores.objetivos}</Dato>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{detalle.error?.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Por privacidad, el admin solo ve cantidades: nunca montos ni detalle de movimientos.
              </p>
            </Seccion>

            <div className="flex justify-end border-t border-border pt-5">
              <Button onClick={() => onCambiarPlan(usuario)}>Cambiar plan</Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

/** Cambio manual de plan (queda en la auditoría con el motivo). */
export const CambiarPlanDialog = ({
  usuario,
  onOpenChange,
}: {
  usuario: UsuarioAdmin | null;
  onOpenChange: (open: boolean) => void;
}) => (
  <AlertDialog open={Boolean(usuario)} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      {usuario && (
        <FormularioPlan key={usuario.id} usuario={usuario} onListo={() => onOpenChange(false)} />
      )}
    </AlertDialogContent>
  </AlertDialog>
);

const FormularioPlan = ({ usuario, onListo }: { usuario: UsuarioAdmin; onListo: () => void }) => {
  const [plan, setPlan] = useState<Plan>(usuario.plan);
  const [motivo, setMotivo] = useState('');
  const queryClient = useQueryClient();
  const cambiar = useMutation({
    mutationFn: () =>
      apiEfe<UsuarioAdmin>(`/admin/usuarios/${usuario.id}/plan`, {
        method: 'PATCH',
        body: { plan, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast({ title: 'Plan actualizado', description: `${usuario.email}: ${NOMBRE_PLAN[plan]}` });
      onListo();
    },
    onError: (e: Error) =>
      toast({
        title: 'No se pudo cambiar el plan',
        description: e.message,
        variant: 'destructive',
      }),
  });

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Cambiar plan</AlertDialogTitle>
        <AlertDialogDescription>
          {usuario.email} pasa a tener las funcionalidades del plan elegido desde ahora. Queda
          registrado en la auditoría.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cambiar-plan" className="eyebrow">
            Plan
          </Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
            <SelectTrigger id="cambiar-plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(NOMBRE_PLAN) as Plan[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {NOMBRE_PLAN[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cambiar-plan-motivo" className="eyebrow">
            Motivo
          </Label>
          <Textarea
            id="cambiar-plan-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej. Cliente de asesoramiento"
            maxLength={300}
          />
        </div>
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          disabled={plan === usuario.plan || cambiar.isPending}
          onClick={(e) => {
            e.preventDefault();
            cambiar.mutate();
          }}
        >
          {cambiar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Cambiar a {NOMBRE_PLAN[plan]}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};
