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

export function Casos(_props: RouteProps) {
  const [sessionCaseIds, setSessionCaseIds] = useState<string[] | null>(null);

  if (sessionCaseIds) return <ClinicalSession caseIds={sessionCaseIds} onExit={() => setSessionCaseIds(null)}/>;

  const startMixedSession = () => setSessionCaseIds(buildMixedCaseSession(clinicalCases));
  const startModeSession = (kind: ClinicalCase['kind']) => {
    setSessionCaseIds(buildCaseSession(clinicalCases.filter(item => item.kind === kind).map(item => item.id)));
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
          const available = clinicalCases.filter(item => item.kind === kind).length;
          return <Button key={kind} variant="answer" className="clinical-mode-button"
            aria-label={`Practicar solo ${kindLabel[kind]}`} onClick={() => startModeSession(kind)}>
            <span className="clinical-kind-icon" aria-hidden="true"><Icon size={19}/></span>
            <span className="clinical-mode-copy"><strong>{kindLabel[kind]}</strong><small>{available} {available === 1 ? 'caso disponible' : 'casos disponibles'}</small></span>
            <ArrowRight className="clinical-mode-arrow" size={16} aria-hidden="true"/>
          </Button>;
        })}
      </div>
    </section>

    <details className="lumar-card clinical-catalog">
      <summary>Ver catálogo de casos</summary>
      <div className="clinical-preview" aria-label="Catálogo de casos">
      {clinicalCases.map(item => {
        const Icon = kindIcon[item.kind];
        return <Card key={item.id}>
          <div className="clinical-card-heading">
            <span className="clinical-kind-icon" aria-hidden="true"><Icon size={19}/></span>
            <span className="lumar-card-meta">{kindLabel[item.kind]}</span>
          </div>
          <h3>{item.titleEs}</h3>
          <p>{item.summaryEs}</p>
        </Card>;
      })}
      </div>
    </details>
    <p className="clinical-disclaimer">Material educativo provisional. No sustituye formación clínica supervisada.</p>
  </section>;
}
