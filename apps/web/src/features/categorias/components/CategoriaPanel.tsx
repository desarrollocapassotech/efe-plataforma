import { COLORES_CATEGORIA } from '@efe/shared/categorias';
import type { Categoria, TipoMovimiento } from '@efe/shared/schemas';
import { Archive, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ColorPicker } from '@/components/ColorPicker';
import { EmojiPicker } from '@/components/EmojiPicker';
import { Button } from '@/components/ui/button';
import { Confirmacion } from '@/components/ui/confirmacion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Panel } from '@/components/ui/panel';
import { esApiError } from '@/lib/api-error';
import { useActualizarCategoria, useBorrarCategoria, useCrearCategoria } from '../hooks';
import { IconoCategoria } from './IconoCategoria';

interface CategoriaPanelProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Sin categoría: alta del tipo indicado. */
  categoria?: Categoria | null;
  tipo: TipoMovimiento;
}

export function CategoriaPanel({ abierto, onCerrar, categoria, tipo }: CategoriaPanelProps) {
  return (
    <Panel
      abierto={abierto}
      onAbiertoChange={(a) => !a && onCerrar()}
      titulo={
        categoria
          ? 'Editar categoría'
          : tipo === 'GASTO'
            ? 'Nueva categoría de gastos'
            : 'Nueva categoría de ingresos'
      }
    >
      {abierto && (
        <FormularioCategoria
          key={categoria?.id ?? `nueva-${tipo}`}
          categoria={categoria ?? null}
          tipo={tipo}
          onListo={onCerrar}
        />
      )}
    </Panel>
  );
}

function FormularioCategoria({
  categoria,
  tipo,
  onListo,
}: {
  categoria: Categoria | null;
  tipo: TipoMovimiento;
  onListo: () => void;
}) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [icono, setIcono] = useState(categoria?.icono ?? '📦');
  const [color, setColor] = useState<string>(categoria?.color ?? COLORES_CATEGORIA[0] ?? '#2E4A8B');
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<'eliminar' | 'archivar' | null>(null);

  const crear = useCrearCategoria();
  const actualizar = useActualizarCategoria();
  const borrar = useBorrarCategoria();
  const guardando = crear.isPending || actualizar.isPending;

  const guardar = async () => {
    setError(null);
    if (!nombre.trim()) {
      setError('Poné un nombre para la categoría.');
      return;
    }
    try {
      if (categoria) {
        await actualizar.mutateAsync({
          id: categoria.id,
          datos: { nombre: nombre.trim(), icono, color },
        });
      } else {
        await crear.mutateAsync({ tipo, nombre: nombre.trim(), icono, color });
      }
      toast.success(categoria ? 'Categoría actualizada' : 'Categoría creada');
      onListo();
    } catch (e) {
      setError(
        esApiError(e, 'CATEGORIA_DUPLICADA')
          ? 'Ya tenés una categoría con ese nombre.'
          : (e as Error).message,
      );
    }
  };

  const archivar = async (archivada: boolean) => {
    if (!categoria) return;
    try {
      await actualizar.mutateAsync({ id: categoria.id, datos: { archivada } });
      toast.success(archivada ? 'Categoría archivada' : 'Categoría restaurada');
      setConfirmar(null);
      onListo();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const eliminar = async () => {
    if (!categoria) return;
    try {
      await borrar.mutateAsync(categoria.id);
      toast.success('Categoría eliminada');
      setConfirmar(null);
      onListo();
    } catch (e) {
      if (esApiError(e, 'CATEGORIA_EN_USO')) setConfirmar('archivar');
      else toast.error((e as Error).message);
    }
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <div className="flex items-center gap-4">
        <IconoCategoria icono={icono} color={color} tamano="lg" />
        <div className="flex-1 space-y-2">
          <Label htmlFor="categoria-nombre">Nombre</Label>
          <Input
            id="categoria-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={tipo === 'GASTO' ? 'Ej. Supermercado' : 'Ej. Changas'}
            maxLength={40}
            autoFocus={!categoria}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Ícono</p>
        <EmojiPicker value={icono} onChange={setIcono} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Color</p>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={guardando}>
        {guardando && <Loader2 className="animate-spin" />}
        {categoria ? 'Guardar cambios' : 'Crear categoría'}
      </Button>

      {categoria && (
        <div className="flex flex-col gap-1 border-t pt-4">
          {categoria.archivada ? (
            <Button type="button" variant="ghost" onClick={() => void archivar(false)}>
              <Archive /> Restaurar categoría
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setConfirmar('archivar')}>
              <Archive /> Archivar categoría
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmar('eliminar')}
          >
            <Trash2 /> Eliminar categoría
          </Button>
          <Confirmacion
            abierta={confirmar === 'eliminar'}
            onAbiertaChange={(a) => !a && setConfirmar(null)}
            titulo={`¿Eliminar "${categoria.nombre}"?`}
            mensaje="Se borra para siempre. Si ya la usaste en algún movimiento, te vamos a ofrecer archivarla."
            textoConfirmar="Eliminar"
            destructiva
            cargando={borrar.isPending}
            onConfirmar={() => void eliminar()}
          />
          <Confirmacion
            abierta={confirmar === 'archivar'}
            onAbiertaChange={(a) => !a && setConfirmar(null)}
            titulo={`¿Archivar "${categoria.nombre}"?`}
            mensaje="Deja de aparecer al cargar movimientos, pero lo que ya cargaste la conserva. La podés restaurar cuando quieras."
            textoConfirmar="Archivar"
            cargando={actualizar.isPending}
            onConfirmar={() => void archivar(true)}
          />
        </div>
      )}
    </form>
  );
}
