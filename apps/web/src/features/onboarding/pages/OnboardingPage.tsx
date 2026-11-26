import type { Moneda } from '@efe/shared/dinero';
import type { CrearCuenta, TipoCuenta } from '@efe/shared/schemas';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCrearCuenta, useCuentas } from '@/features/cuentas/hooks';
import { useActualizarMe, useMe } from '@/features/perfil/hooks';
import { cn } from '@/lib/utils';

type Paso = 1 | 2 | 3;

interface Opcion {
  id: string;
  nombre: string;
  icono: string;
  tipo: TipoCuenta;
  /** null = la moneda principal elegida en el paso 1. */
  moneda: Moneda | null;
}

const OPCIONES: Opcion[] = [
  { id: 'efectivo', nombre: 'Efectivo', icono: '💵', tipo: 'EFECTIVO', moneda: null },
  { id: 'banco', nombre: 'Banco', icono: '🏦', tipo: 'BANCO', moneda: null },
  { id: 'mp', nombre: 'Mercado Pago', icono: '📱', tipo: 'BILLETERA', moneda: null },
  { id: 'otra-moneda', nombre: '', icono: '💲', tipo: 'EFECTIVO', moneda: 'USD' },
];

/** La opción de "la otra moneda": Dólares si la principal es pesos, y al revés. */
function opcionesPara(principal: Moneda): (Opcion & { moneda: Moneda })[] {
  return OPCIONES.map((o) =>
    o.id === 'otra-moneda'
      ? principal === 'ARS'
        ? { ...o, nombre: 'Dólares', moneda: 'USD' as const }
        : { ...o, nombre: 'Pesos', moneda: 'ARS' as const }
      : { ...o, moneda: o.moneda ?? principal },
  );
}

/**
 * Onboarding en 3 pasos cortos (ARCHITECTURE §3.2, paso 2.5 del plan):
 * 1. nombre y moneda principal · 2. dónde tenés la plata (crea las cuentas) · 3. listo.
 * Pensado para cualquier persona: pocas preguntas, opciones grandes, se puede saltear.
 */
export function OnboardingPage() {
  const { data: me } = useMe();
  const cuentas = useCuentas();
  const actualizarMe = useActualizarMe();
  const crearCuenta = useCrearCuenta();

  const [paso, setPaso] = useState<Paso>(1);
  const [nombre, setNombre] = useState(me?.nombre ?? '');
  const [moneda, setMoneda] = useState<Moneda>(me?.monedaPrincipal ?? 'ARS');
  const [elegidas, setElegidas] = useState<Set<string>>(new Set(['efectivo']));
  const [error, setError] = useState<string | null>(null);

  const yaTieneCuentas = (cuentas.data?.length ?? 0) > 0;

  const guardarPaso1 = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('Contanos cómo te llamás.');
      return;
    }
    try {
      await actualizarMe.mutateAsync({ nombre: nombre.trim(), monedaPrincipal: moneda });
      setPaso(2);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  /** Crea las cuentas elegidas; si no eligió ninguna (o saltea), crea "Efectivo". */
  const guardarPaso2 = async (saltear = false) => {
    setError(null);
    if (yaTieneCuentas) {
      setPaso(3);
      return;
    }
    const opciones = opcionesPara(moneda);
    const aCrear = saltear ? [] : opciones.filter((o) => elegidas.has(o.id));
    const cuentasNuevas: CrearCuenta[] = (aCrear.length > 0 ? aCrear : [opciones[0]!]).map((o) => ({
      nombre: o.nombre,
      tipo: o.tipo,
      moneda: o.moneda,
    }));
    try {
      for (const c of cuentasNuevas) await crearCuenta.mutateAsync(c);
      setPaso(3);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const terminar = () =>
    actualizarMe.mutate({ onboardingCompletado: true }, { onError: (e) => toast.error(e.message) });

  const alternar = (id: string) =>
    setElegidas((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Logo />
        <span className="text-sm text-muted-foreground" aria-live="polite">
          Paso {paso} de 3
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <div key={n} className={cn('h-1.5 rounded-full', n <= paso ? 'bg-gold' : 'bg-muted')} />
        ))}
      </div>

      <div className="flex flex-1 flex-col pt-10">
        {paso === 1 && (
          <form
            className="flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void guardarPaso1();
            }}
          >
            <div className="flex-1 space-y-8">
              <h1 className="text-3xl font-semibold">¡Hola! Bienvenido a EFE Capital</h1>
              <div className="space-y-2">
                <Label htmlFor="onb-nombre" className="text-base">
                  ¿Cómo te llamás?
                </Label>
                <Input
                  id="onb-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  maxLength={80}
                  className="h-12 text-lg"
                  autoFocus
                />
              </div>
              <fieldset className="space-y-3">
                <legend className="text-base font-medium">
                  ¿En qué moneda manejás tu plata día a día?
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { m: 'ARS', titulo: 'Pesos', simbolo: '$' },
                      { m: 'USD', titulo: 'Dólares', simbolo: 'US$' },
                    ] as const
                  ).map(({ m, titulo, simbolo }) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={moneda === m}
                      onClick={() => setMoneda(m)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border-2 py-5 transition',
                        moneda === m
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-accent',
                      )}
                    >
                      <span className="font-display text-2xl font-semibold">{simbolo}</span>
                      <span className="font-medium">{titulo}</span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Podés usar las dos; esta es la que vas a ver primero.
                </p>
              </fieldset>
            </div>
            {error && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={actualizarMe.isPending}>
              {actualizarMe.isPending && <Loader2 className="animate-spin" />}
              Continuar
            </Button>
          </form>
        )}

        {paso === 2 && (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold">¿Dónde tenés tu plata?</h1>
                <p className="text-muted-foreground">
                  {yaTieneCuentas
                    ? 'Ya tenés cuentas creadas. Podés cambiarlas cuando quieras desde "Más".'
                    : 'Tocá todas las que uses. Después podés agregar o cambiar.'}
                </p>
              </div>
              {!yaTieneCuentas && (
                <div className="grid grid-cols-2 gap-3">
                  {opcionesPara(moneda).map((o) => {
                    const elegida = elegidas.has(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={elegida}
                        onClick={() => alternar(o.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-2 rounded-xl border-2 py-6 transition',
                          elegida ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                        )}
                      >
                        {elegida && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="text-4xl" aria-hidden>
                          {o.icono}
                        </span>
                        <span className="font-medium">{o.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {error && (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={() => void guardarPaso2()}
                disabled={crearCuenta.isPending}
              >
                {crearCuenta.isPending && <Loader2 className="animate-spin" />}
                Continuar
              </Button>
              {!yaTieneCuentas && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => void guardarPaso2(true)}
                  disabled={crearCuenta.isPending}
                >
                  Saltear por ahora
                </Button>
              )}
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-semibold">
                ¡Listo{me?.nombre ? `, ${me.nombre}` : ''}!
              </h1>
              <ul className="space-y-4 text-lg">
                <li className="flex gap-3">
                  <span aria-hidden>➕</span> Anotá cada gasto o ingreso en segundos.
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>📊</span> Mirá en Inicio cuánto gastaste en el mes y en qué.
                </li>
                <li className="flex gap-3">
                  <span aria-hidden>💳</span> Seguí tus tarjetas y cuotas sin sorpresas.
                </li>
              </ul>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={terminar}
              disabled={actualizarMe.isPending}
            >
              {actualizarMe.isPending && <Loader2 className="animate-spin" />}
              Empezar
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
