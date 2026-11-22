import { useSyncExternalStore } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { casos } from '../../content/casos/rodilla';
import { clinicalCases } from '../../content/casos/session';
import { retoModeLabels } from '../../content/types';
import { EvaluationHistoryLink, EvaluationSummary } from '../../shared/evaluacion/EvaluationSummary';
import type { PerformanceLevel } from '../../shared/evaluacion/scoring';
import type { RouteProps } from '../../shared/navegacion';
import { getProgress, subscribeProgress, type PracticeSessionMode } from '../../shared/progreso';
import { Button } from '../../shared/ui/Button';
import { ContentState } from '../../shared/ui/ContentState';
import type { Score } from './ClinicalResult';

const levelLabels = {
  strong: 'Buen dominio',
  partial: 'En progreso',
  review: 'Para repasar',
} satisfies Record<PerformanceLevel, string>;
const levelsInOrder = Object.keys(levelLabels) as PerformanceLevel[];

const casesHref = '#practicar/casos';
export const clinicalResultHref = (eventId: string) => `${casesHref}/resultado/${encodeURIComponent(eventId)}`;

export function ClinicalSummary({ total, count, levels, mode, onExit, onRepeat }: {
  total: Score;
  count: number;
  levels: Record<PerformanceLevel, number>;
  mode: PracticeSessionMode;
  onExit: () => void;
  onRepeat: () => void;
}) {
  return <section className="lumar-page clinical-session evaluation-results">
    <EvaluationSummary title={count === 5 ? 'Completaste los cinco casos' : 'Completaste la práctica'}
      label={retoModeLabels[mode]} score={total}/>
    <section className="lumar-card clinical-summary-detail" aria-labelledby="clinical-summary-detail-title">
      <h2 id="clinical-summary-detail-title">Desempeño por caso</h2>
      <div className="clinical-summary-bar" aria-hidden="true">
        {levelsInOrder.filter(key => levels[key] > 0).map(key =>
          <span key={key} data-level={key} style={{ flexGrow: levels[key] }}/>)}
      </div>
      <ul className="clinical-level-summary" aria-label="Distribución del desempeño">
        {levelsInOrder.map(key => <li key={key} className="clinical-level-card" data-level={key}>
          <span>{levelLabels[key]}</span><strong>{levels[key]}</strong>
        </li>)}
      </ul>
    </section>
    <div className="evaluation-actions">
      <Button onClick={onRepeat}><RotateCcw size={17} aria-hidden="true"/> Repetir</Button>
      <Button variant="secondary" onClick={onExit}><ArrowLeft size={17} aria-hidden="true"/> Volver a Casos clínicos</Button>
      <EvaluationHistoryLink/>
    </div>
  </section>;
}

export function ClinicalHistoryResult({ params }: RouteProps) {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const event = events.find(item => item.id === params.intento);
  if (event?.kind !== 'practice' || event.groupId !== 'clinical-cases') {
    return <section className="lumar-page">
      <ContentState state="unavailable" title="Resultado no disponible en este dispositivo"><EvaluationHistoryLink/></ContentState>
    </section>;
  }

  const id = event.activityId ?? event.itemId;
  const title = clinicalCases.find(item => item.id === id)?.titleEs ?? casos.find(item => item.id === id)?.titulo;
  const label = event.quick ? 'Práctica rápida' : retoModeLabels[event.mode ?? 'entrenamiento'];
  return <section className="lumar-page clinical-session evaluation-results">
    <EvaluationSummary key={event.id} title="Resultado del caso" subtitle={title} label={label} score={event}/>
    <div className="evaluation-actions">
      <a className="button button--primary lumar-link" href={casesHref}>Volver a Casos clínicos</a>
      <EvaluationHistoryLink/>
    </div>
  </section>;
}
