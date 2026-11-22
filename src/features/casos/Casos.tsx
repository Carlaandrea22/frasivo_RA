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
import { Segmented } from '../../shared/ui/Segmented';
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
const practiceModes = [
  { id: 'entrenamiento', label: 'Entrenamiento' },
  { id: 'evaluacion', label: 'Evaluación' },
] as const;

function RecommendedCase({ ids, mode }: { ids: readonly string[]; mode: PracticeSessionMode }) {
  const [selection] = useState(() => buildCaseSession(ids).slice(0, 1));
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
  const [sessionCaseIds, setSessionCaseIds] = useState<string[] | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeSessionMode>('entrenamiento');

  if (sessionCaseIds) return <ClinicalSession caseIds={sessionCaseIds} mode={practiceMode} onExit={() => setSessionCaseIds(null)}/>;

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

    <section className="clinical-practice-mode" aria-labelledby="clinical-practice-mode-title">
      <h2 id="clinical-practice-mode-title">Modo de práctica</h2>
      <Segmented label="Modo de práctica" options={practiceModes} value={practiceMode} onChange={id => {
        const mode = practiceModes.find(option => option.id === id);
        if (mode) setPracticeMode(mode.id);
      }}/>
      <p>{practiceMode === 'entrenamiento'
        ? 'Usa las pistas disponibles y reintenta los casos que necesites repasar.'
        : 'Resuelve cada caso sin pistas. Verás la corrección al comprobar tu respuesta.'}</p>
    </section>

    <Card className="clinical-intro">
      <span className="clinical-intro-icon" aria-hidden="true"><Stethoscope size={26}/></span>
      <div>
        <h2>Sesión mixta</h2>
        <p>Un caso de cada modo, incluida la conexión de síntomas con sus causas.</p>
      </div>
      <Button onClick={startMixedSession}>Empezar sesión de 5 casos <ArrowRight size={17}/></Button>
    </Card>

    <section className="clinical-mode-section" aria-labelledby="clinical-mode-title">
      <h2 id="clinical-mode-title">Elige un tipo de caso</h2>
      <div className="clinical-mode-grid">
        {(Object.keys(clinicalModeLabels) as ClinicalCase['kind'][]).map(kind => {
          const Icon = kindIcon[kind];
          return <Button key={kind} variant="answer" className="clinical-mode-button"
            aria-label={`Practicar solo ${clinicalModeLabels[kind]}`} onClick={() => startModeSession(kind)}>
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
