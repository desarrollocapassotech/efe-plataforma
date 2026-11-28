import type { Moneda } from '@efe/shared/dinero';
import { hoy } from '@efe/shared/fechas';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Pagina } from '@/components/Pantallas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { useAuth } from '@/features/auth/auth-context';
import { NOMBRE_MONEDA } from '@/features/cuentas/tipos';
import { Segmentado } from '@/features/movimientos/components/Selectores';
import { fechaCorta } from '@/lib/fechas-ui';
import { eliminarCuenta, exportarDatos } from '../api';
import { useActualizarMe, useMe } from '../hooks';

/** Más → Tu perfil: datos, descarga de todos los datos y baja de la cuenta (Ley 25.326). */
export function PerfilPage() {
  const { data: me } = useMe();
  const actualizar = useActualizarMe();
  const [nombre, setNombre] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  if (!me) return null;
  const nombreActual = nombre ?? me.nombre ?? '';

  const guardar = async (datos: { nombre?: string | null; monedaPrincipal?: Moneda }) => {
    try {
      await actualizar.mutateAsync(datos);
      toast.success('Listo, guardado');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      const datos = await exportarDatos();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }),
      );
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `efe-mis-datos-${hoy()}.json`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Pagina titulo="Tu perfil" volverA="/mas">
      <section className="space-y-4 rounded-xl border bg-card px-5 py-4">
        <div className="space-y-2">
          <Label htmlFor="perfil-nombre">¿Cómo te llamamos?</Label>
          <div className="flex gap-2">
            <Input
              id="perfil-nombre"
              value={nombreActual}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={80}
            />
            <Button
              variant="outline"
              disabled={actualizar.isPending || nombreActual.trim() === (me.nombre ?? '')}
              onClick={() => void guardar({ nombre: nombreActual.trim() || null })}
            >
              Guardar
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">Moneda principal</span>
          <Segmentado
            etiqueta="Moneda principal"
            opciones={(['ARS', 'USD'] as const).map((m) => ({
              valor: m,
              nombre: NOMBRE_MONEDA[m],
            }))}
            valor={me.monedaPrincipal}
            onChange={(m) => void guardar({ monedaPrincipal: m })}
          />
          <p className="text-xs text-muted-foreground">
            Es la que se propone al crear cuentas y objetivos.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Email: {me.email}</p>
      </section>

      <section className="space-y-3 rounded-xl border bg-card px-5 py-4">
        <h2 className="font-semibold">Tus datos</h2>
        <p className="text-sm text-muted-foreground">
          Descargá todo lo que cargaste (cuentas, movimientos, tarjetas, objetivos) en un archivo.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void descargar()}
          disabled={descargando}
        >
          {descargando ? <Loader2 className="animate-spin" /> : <Download />}
          Descargar mis datos
        </Button>
        <p className="text-xs text-muted-foreground">
          {me.terminosAceptadosEn &&
            `Aceptaste los términos el ${fechaCorta(me.terminosAceptadosEn.slice(0, 10))}. `}
          <Link to="/terminos" className="underline-offset-4 hover:underline">
            Términos
          </Link>{' '}
          ·{' '}
          <Link to="/privacidad" className="underline-offset-4 hover:underline">
            Privacidad
          </Link>
        </p>
      </section>

      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        onClick={() => setEliminar(true)}
      >
        <Trash2 /> Eliminar mi cuenta
      </Button>

      <Panel abierto={eliminar} onAbiertoChange={setEliminar} titulo="Eliminar tu cuenta">
        {eliminar && <EliminarCuenta onCancelar={() => setEliminar(false)} />}
      </Panel>
    </Pagina>
  );
}

/** Segunda confirmación: hay que escribir ELIMINAR (y se explica qué pasa). */
function EliminarCuenta({ onCancelar }: { onCancelar: () => void }) {
  const { logout } = useAuth();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const confirmado = texto.trim().toUpperCase() === 'ELIMINAR';

  const confirmar = async () => {
    setEnviando(true);
    try {
      const { purgaEn } = await eliminarCuenta();
      toast.success(
        `Tu cuenta se va a borrar el ${fechaCorta(purgaEn.slice(0, 10))}. Hasta entonces la podés recuperar entrando de nuevo.`,
        { duration: 10_000 },
      );
      await logout();
    } catch (e) {
      toast.error((e as Error).message);
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Se cierra tu sesión en todos tus dispositivos.</li>
        <li>Durante 30 días la podés recuperar entrando de nuevo.</li>
        <li>Después se borran para siempre todos tus datos.</li>
      </ul>
      <p>Si querés, antes descargá tus datos desde esta misma pantalla.</p>
      <div className="space-y-2">
        <Label htmlFor="confirmar-eliminar">
          Para confirmar, escribí <strong>ELIMINAR</strong>
        </Label>
        <Input
          id="confirmar-eliminar"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="destructive"
          disabled={!confirmado || enviando}
          onClick={() => void confirmar()}
        >
          {enviando && <Loader2 className="animate-spin" />}
          Eliminar mi cuenta
        </Button>
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
