import { useState } from 'react';
import { CircleHelp, ListOrdered, MessagesSquare, Stethoscope } from 'lucide-react';
import { clinicalCases } from '../../content/casos/session';
import type { RouteProps } from '../../shared/navegacion';
import { PracticeTabs } from '../../shared/navegacion/PracticarHome';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ClinicalSession } from './ClinicalSession';
import './casos.css';

const kindLabel = {
  interview: 'Conversación y comprensión',
  ordering: 'Ordenar actuaciones',
  'multiple-choice': 'Selección múltiple',
} as const;

const kindIcon = {
  interview: MessagesSquare,
  ordering: ListOrdered,
  'multiple-choice': CircleHelp,
} as const;

export function Casos(_props: RouteProps) {
  const [started, setStarted] = useState(false);

  if (started) return <ClinicalSession onExit={() => setStarted(false)}/>;

  return <section className="lumar-page clinical-home">
    <header>
      <p className="lumar-eyebrow">Práctica guiada en inglés</p>
      <h1>Casos clínicos</h1>
      <p className="lumar-subtitle">Completa cinco situaciones seguidas y guarda tu resultado en Mi progreso.</p>
    </header>
    <PracticeTabs active="casos"/>

    <Card className="clinical-intro">
      <span className="section-icon" aria-hidden="true"><Stethoscope size={22}/></span>
      <div>
        <h2>Una sesión, cinco casos</h2>
        <p>Practicarás conversaciones, orden de actuaciones y decisiones breves. El contenido clínico aparece en inglés y las instrucciones en español.</p>
      </div>
      <Button onClick={() => setStarted(true)}>Empezar sesión de 5 casos</Button>
    </Card>

    <div className="clinical-preview" aria-label="Contenido de la sesión">
      {clinicalCases.map(item => {
        const Icon = kindIcon[item.kind];
        return <Card key={item.id}>
          <div className="clinical-card-heading">
            <span className="clinical-kind-icon" aria-hidden="true"><Icon size={19}/></span>
            <span className="lumar-card-meta">{kindLabel[item.kind]}</span>
          </div>
          <h2>{item.titleEs}</h2>
          <p>{item.summaryEs}</p>
        </Card>;
      })}
    </div>
    <p className="clinical-disclaimer">Material educativo provisional. No sustituye formación clínica supervisada.</p>
  </section>;
}
