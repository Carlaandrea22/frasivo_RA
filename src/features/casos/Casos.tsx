import { useState } from 'react';
import { ArrowRight, CircleHelp, Link2, ListOrdered, MessagesSquare, Search, Stethoscope } from 'lucide-react';
import { clinicalCases } from '../../content/casos/session';
import { clinicalModeLabels, type ClinicalCase } from '../../content/casos/sessionTypes';
import type { RouteProps } from '../../shared/navegacion';
import { PracticeTabs } from '../../shared/navegacion/PracticarHome';
import type { PracticeSessionMode } from '../../shared/progreso';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { ContentState } from '../../shared/ui/ContentState';
import { ClinicalSetup } from './ClinicalSetup';
import { ClinicalSession } from './ClinicalSession';
import { buildCaseSession, buildMixedCaseSession } from './clinicalEngine';
import './casos.css';

const kindIcon = {
  interview: MessagesSquare,
  investigation: Search,
  ordering: ListOrdered,
  'multiple-choice': CircleHelp,
  matching: Link2,
} as const;
const modeDescription = {
  interview: 'Recuerda los detalles de una conversación con el paciente.',
  investigation: 'Haz preguntas, reúne hallazgos y elige una hipótesis.',
  ordering: 'Organiza las actuaciones de una situación clínica.',
  'multiple-choice': 'Elige la respuesta que mejor encaja con el caso.',
  matching: 'Conecta cada paciente con la causa que encaja con sus pistas.',
} as const;
function RecommendedCase({ ids, mode }: { ids: readonly string[]; mode: PracticeSessionMode }) {
  const [selection] = useState(() => buildCaseSession(ids, undefined, 1));
  return <ClinicalSession caseIds={selection} mode={mode} onExit={() => { window.location.hash = 'practicar'; }}/>;
}

export function CasoRecomendado({ params }: RouteProps) {
  const ids = clinicalCases.filter(item => item.kind === params.modo).map(item => item.id);
  const mode = params.formato === 'evaluacion' ? 'evaluacion' : 'entrenamiento';
  if (ids.length) return <RecommendedCase key={`${params.modo}/${mode}`} ids={ids} mode={mode}/>;
  return <section className="lumar-page"><ContentState state="unavailable" title="Modo clínico no disponible">
    <a href="#practicar/casos">Ver casos clínicos</a>
  </ContentState></section>;
}

export function Casos(_props: RouteProps) {
  const [kind, setKind] = useState<ClinicalCase['kind'] | 'mixed'>();
  const [session, setSession] = useState<{ ids: string[]; mode: PracticeSessionMode }>();

  const returnHome = () => {
    setSession(undefined);
    setKind(undefined);
    window.scrollTo(0, 0);
  };

  if (session) return <ClinicalSession caseIds={session.ids} mode={session.mode} onExit={returnHome}/>;
  if (kind) {
    const mixed = kind === 'mixed';
    return <ClinicalSetup title={mixed ? 'Sesión mixta' : clinicalModeLabels[kind]}
      cases={mixed ? clinicalCases : clinicalCases.filter(item => item.kind === kind)}
      defaultCount={mixed ? 5 : kind === 'multiple-choice' ? 1 : 2} onBack={returnHome}
      onStart={(pool, count, mode) => setSession({
        ids: mixed ? buildMixedCaseSession(pool, undefined, count) : buildCaseSession(pool.map(item => item.id), undefined, count),
        mode,
      })}/>;
  }

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
        <p>Combina distintos tipos de caso en una práctica.</p>
      </div>
      <Button onClick={() => setKind('mixed')}>Configurar sesión mixta <ArrowRight size={17}/></Button>
    </Card>

    <section className="clinical-mode-section" aria-labelledby="clinical-mode-title">
      <h2 id="clinical-mode-title">Elige un tipo de caso</h2>
      <div className="clinical-mode-grid">
        {(Object.keys(clinicalModeLabels) as ClinicalCase['kind'][]).map(kind => {
          const Icon = kindIcon[kind];
          return <Button key={kind} variant="answer" className="clinical-mode-button"
            aria-label={`Practicar solo ${clinicalModeLabels[kind]}`} onClick={() => setKind(kind)}>
            <span className="clinical-kind-icon" aria-hidden="true"><Icon size={19}/></span>
            <span className="clinical-mode-copy"><strong>{clinicalModeLabels[kind]}</strong><small>{modeDescription[kind]}</small></span>
            <ArrowRight className="clinical-mode-arrow" size={16} aria-hidden="true"/>
          </Button>;
        })}
      </div>
    </section>

    <p className="clinical-disclaimer">Material educativo provisional. No sustituye formación clínica supervisada.</p>
  </section>;
}
