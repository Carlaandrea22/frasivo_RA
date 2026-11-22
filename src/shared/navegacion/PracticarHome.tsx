import { useSyncExternalStore } from 'react';
import { ArrowRight, ClipboardList, MessagesSquare, Sparkles } from 'lucide-react';
import { Mascota } from '../../features/progreso/mascota/Mascota';
import { obtenerEvolucion } from '../../features/progreso/mascota/evolucion';
import { practiceGroupLabels, practiceModeLabels, practiceProgress, recommendationHref, recommendationReason } from '../../features/progreso/practiceProgress';
import { getProgress, subscribeProgress } from '../progreso';
import { useRacha } from '../progreso/useRacha';
import { Card } from '../ui/Card';
import { Segmented } from '../ui/Segmented';
import './practicar-home.css';

const options = [
  { id: 'retos', label: 'Retos de anatomía', href: '#practicar/retos' },
  { id: 'casos', label: 'Casos clínicos', href: '#practicar/casos' },
];

export function PracticeTabs({ active }: { active?: string }) {
  return <Segmented label="Modalidad de práctica" value={active ?? ''} options={options}/>;
}

export function PracticarHome() {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const { recommendation } = practiceProgress(events);
  const { dias } = useRacha(events);
  const { actual } = obtenerEvolucion(dias);
  const suggested = recommendation ?? { group: 'clinical', kind: 'multiple-choice' } as const;

  return <section className="lumar-page practice-home">
    <header><h1>Practicar</h1></header>
    <Card className="practice-home-feature">
      <div className="practice-home-feature-copy">
        <p className="lumar-eyebrow"><Sparkles size={16} aria-hidden="true"/> {recommendation ? 'Sugerencia para ti' : 'Tu primera práctica'}</p>
        <h2>{practiceModeLabels[suggested.kind]}</h2>
        <p>{recommendation ? recommendationReason(recommendation) : 'Empieza con una sola pregunta sobre un caso clínico.'}</p>
        <a className="button button--primary lumar-link" href={recommendationHref(suggested)}>Empezar práctica <ArrowRight size={17} aria-hidden="true"/></a>
      </div>
      <div className="practice-home-feature-stage">
        <Mascota etapa={actual.id} animacion="reposo"/>
      </div>
    </Card>
    <div className="practice-home-options">
      <Card className="practice-home-option" data-group="challenge">
        <span className="practice-home-option-icon"><ClipboardList size={23} aria-hidden="true"/></span>
        <h2>{practiceGroupLabels.challenge}</h2>
        <p>Identifica estructuras en 3D, ubica sus partes y relaciona cada una con su función.</p>
        <a className="button button--secondary lumar-link" href={options[0].href}>{options[0].label}<ArrowRight size={17} aria-hidden="true"/></a>
      </Card>
      <Card className="practice-home-option" data-group="clinical">
        <span className="practice-home-option-icon"><MessagesSquare size={23} aria-hidden="true"/></span>
        <h2>{practiceGroupLabels.clinical}</h2>
        <p>Entrevista pacientes, ordena actuaciones y conecta síntomas con sus posibles causas.</p>
        <a className="button button--secondary lumar-link" href={options[1].href}>{options[1].label}<ArrowRight size={17} aria-hidden="true"/></a>
      </Card>
    </div>
  </section>;
}
