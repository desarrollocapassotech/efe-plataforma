import { Target } from 'lucide-react';
import { EnConstruccion, Pagina } from '@/components/Pantallas';

// Páginas provisorias de las secciones que se construyen en las fases 2 a 4 del plan.
// Cuando cada una se implemente, se mueve a su carpeta en features/.

export function ObjetivosPage() {
  return (
    <Pagina titulo="Objetivos">
      <EnConstruccion icono={Target} texto="Acá vas a seguir tus objetivos de ahorro." />
    </Pagina>
  );
}
