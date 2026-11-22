import { ClipboardList, MessagesSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Segmented } from '../ui/Segmented';
import { controlesRachaVisibles } from '../progreso/useRacha';

const options = [
  { id: 'retos', label: 'Retos de anatomía', href: '#practicar/retos' },
  { id: 'casos', label: 'Casos clínicos', href: '#practicar/casos' },
];

export function PracticeTabs({ active }: { active?: string }) {
  return <Segmented label="Modalidad de práctica" value={active ?? ''} options={options}/>;
}

export function PracticarHome() {
  return <section className="lumar-page">
    <h1>Practicar</h1>
    <Card>
      <ClipboardList size={24} aria-hidden="true"/>
      <p>Identifica estructuras, ubica sus partes y relaciona lo que ves con su función.</p>
      <a className="button button--primary lumar-link" href={options[0].href}>{options[0].label}</a>
    </Card>
    <Card>
      <MessagesSquare size={24} aria-hidden="true"/>
      <p>Entrevista a un paciente virtual y prepara una explicación de tu hipótesis.</p>
      <a className="button button--secondary lumar-link" href={options[1].href}>{options[1].label}</a>
    </Card>
    {controlesRachaVisibles() && <div>
      <a className="button button--secondary lumar-link" href="#progreso">Probar racha de la mascota</a>
    </div>}
  </section>;
}
