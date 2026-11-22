import { useSyncExternalStore } from 'react';
import { ArrowLeft, History } from 'lucide-react';
import { getProgress, subscribeProgress } from '../../shared/progreso';
import { useRacha } from '../../shared/progreso/useRacha';
import { Button } from '../../shared/ui/Button';
import { Mascota } from '../progreso/mascota/Mascota';
import { obtenerEvolucion } from '../progreso/mascota/evolucion';
import { isPerfectWithoutHints, performanceLevel, scoreRatio, type PerformanceLevel } from './clinicalEngine';
import { ClinicalConfetti } from './ClinicalConfetti';
import type { Score } from './ClinicalResult';

const levelLabels = {
  strong: 'Buen dominio',
  partial: 'En progreso',
  review: 'Para repasar',
} satisfies Record<PerformanceLevel, string>;
const levelsInOrder = Object.keys(levelLabels) as PerformanceLevel[];

export function ClinicalSummary({ total, count, levels, onExit }: {
  total: Score;
  count: number;
  levels: Record<PerformanceLevel, number>;
  onExit: () => void;
}) {
  const { events } = useSyncExternalStore(subscribeProgress, getProgress);
  const { dias } = useRacha(events);
  const { actual } = obtenerEvolucion(dias);
  const percentage = Math.round(scoreRatio(total) * 100);
  const level = performanceLevel(total);
  const assisted = total.assisted ?? 0;

  return <section className="lumar-page clinical-session clinical-complete">
    {count > 1 && isPerfectWithoutHints(total) && <ClinicalConfetti/>}
    <header className="lumar-card clinical-summary-hero" data-level={level}>
      <div className="clinical-summary-heading">
        <p className="lumar-eyebrow">Sesión terminada</p>
        <h1>{count === 5 ? 'Completaste los cinco casos' : 'Completaste la práctica'}</h1>
        <p>{level === 'strong' ? 'Buen trabajo. Tu práctica quedó registrada.' : 'Tu práctica quedó registrada. Puedes volver a probar cuando quieras.'}</p>
      </div>
      <div className="clinical-summary-score">
        <strong>{percentage}<span>%</span></strong>
        <span>de aciertos</span>
      </div>
      <Mascota className="clinical-summary-mascot" etapa={actual.id}
        animacion={level === 'strong' ? 'celebracion' : level === 'review' ? 'triste' : 'reposo'}/>
    </header>
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
      <p className="clinical-session-totals">{total.correct + assisted} aciertos · {assisted} con pista · {total.errors} para revisar · {total.hints ?? 0} pistas</p>
    </section>
    <div className="clinical-result-actions">
      <Button onClick={onExit}><ArrowLeft size={17}/> Volver a Casos clínicos</Button>
      <a className="button button--secondary lumar-link" href="#progreso/practicas"><History size={17}/> Ver mis prácticas</a>
    </div>
  </section>;
}
