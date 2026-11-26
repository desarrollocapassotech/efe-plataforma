import { LayoutDashboard } from 'lucide-react';
import { EnConstruccion, Pagina } from '@/components/Pantallas';
import { useMe } from '@/features/perfil/hooks';

// Dashboard real en el paso 2.7.
export function InicioPage() {
  const { data: me } = useMe();
  return (
    <Pagina titulo={me?.nombre ? `Hola, ${me.nombre}` : 'Hola'}>
      <EnConstruccion
        icono={LayoutDashboard}
        texto="Acá vas a ver tus ingresos, gastos y saldo del mes."
      />
    </Pagina>
  );
}
