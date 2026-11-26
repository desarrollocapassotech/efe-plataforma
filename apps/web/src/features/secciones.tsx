import { CreditCard, Target } from 'lucide-react';
import { EnConstruccion, Pagina } from '@/components/Pantallas';

// Páginas provisorias de las secciones que se construyen en las fases 2 a 4 del plan.
// Cuando cada una se implemente, se mueve a su carpeta en features/.

export function TarjetasPage() {
  return (
    <Pagina titulo="Tarjetas">
      <EnConstruccion
        icono={CreditCard}
        texto="Acá vas a ver tus resúmenes, cuotas y cuánto tenés comprometido."
      />
    </Pagina>
  );
}

export function ObjetivosPage() {
  return (
    <Pagina titulo="Objetivos">
      <EnConstruccion icono={Target} texto="Acá vas a seguir tus objetivos de ahorro." />
    </Pagina>
  );
}
