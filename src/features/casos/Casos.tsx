import { useState } from 'react';
import { ArrowRight, CircleHelp, ListOrdered, MessagesSquare, Search, Stethoscope } from 'lucide-react';
import { clinicalCases } from '../../content/casos/session';
import type { ClinicalCase } from '../../content/casos/sessionTypes';
import type { RouteProps } from '../../shared/navegacion';
import { PracticeTabs } from '../../shared/navegacion/PracticarHome';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ClinicalSession } from './ClinicalSession';
import { buildCaseSession, buildMixedCaseSession } from './clinicalEngine';
import './casos.css';

const kindLabel = {
  interview: 'Conversación y comprensión',
  investigation: 'Investigación clínica',
  ordering: 'Ordenar actuaciones',
  'multiple-choice': 'Selección múltiple',
} as const;

const kindIcon = {
  interview: MessagesSquare,
  investigation: Search,
  ordering: ListOrdered,
  'multiple-choice': CircleHelp,
} as const;
const modeDescription = {
  interview: 'Recuerda los detalles de una conversación con el paciente.',
  investigation: 'Haz preguntas, reúne hallazgos y elige una hipótesis.',
  ordering: 'Organiza las actuaciones de una situación clínica.',
  'multiple-choice': 'Elige la respuesta que mejor encaja con el caso.',
} as const;

export function Casos(_props: RouteProps) {
  const [sessionCaseIds, setSessionCaseIds] = useState<string[] | null>(null);

  if (sessionCaseIds) return <ClinicalSession caseIds={sessionCaseIds} onExit={() => setSessionCaseIds(null)}/>;

  const startMixedSession = () => setSessionCaseIds(buildMixedCaseSession(clinicalCases));
  const startModeSession = (kind: ClinicalCase['kind']) => {
    const ids = clinicalCases.filter(item => item.kind === kind).map(item => item.id);
    setSessionCaseIds(buildCaseSession(ids).slice(0, kind === 'multiple-choice' ? 1 : 2));
  };

  return <section className="lumar-page clinical-home">
    <header>
      <h1>Casos clínicos</h1>
      <p className="lumar-subtitle">Practica con pacientes simulados y revisa tus resultados en Mi progreso.</p>
    </header>
    <PracticeTabs active="casos"/>

    <Card className="clinical-intro">
      <span className="clinical-intro-icon" aria-hidden="true"><Stethoscope size={26}/></span>
      <div>
        <h2>Sesión mixta</h2>
        <p>Cinco casos que combinan lectura, investigación, orden y selección múltiple.</p>
      </div>
      <Button onClick={startMixedSession}>Empezar sesión de 5 casos <ArrowRight size={17}/></Button>
    </Card>

    <section className="clinical-mode-section" aria-labelledby="clinical-mode-title">
      <h2 id="clinical-mode-title">Practica por modo</h2>
      <div className="clinical-mode-grid">
        {(Object.keys(kindLabel) as ClinicalCase['kind'][]).map(kind => {
          const Icon = kindIcon[kind];
          return <Button key={kind} variant="answer" className="clinical-mode-button"
            aria-label={`Practicar solo ${kindLabel[kind]}`} onClick={() => startModeSession(kind)}>
            <span className="clinical-kind-icon" aria-hidden="true"><Icon size={19}/></span>
            <span className="clinical-mode-copy"><strong>{kindLabel[kind]}</strong><small>{modeDescription[kind]}</small></span>
            <ArrowRight className="clinical-mode-arrow" size={16} aria-hidden="true"/>
          </Button>;
        })}
      </div>
    </section>

    <p className="clinical-disclaimer">Material educativo provisional. No sustituye formación clínica supervisada.</p>
  </section>;
}
