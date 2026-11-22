import { History } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { EvaluationConfetti } from './EvaluationConfetti';
import { EvaluationMascot } from './EvaluationMascot';
import { performanceLevel, scoreRatio, type GradedScore } from './scoring';

export function EvaluationSummary({ title, subtitle, label, score }: {
  title: string;
  subtitle?: string;
  label: string;
  score: GradedScore;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [title, subtitle]);
  const level = performanceLevel(score);
  const percentage = Math.round(scoreRatio(score) * 100);
  const assisted = score.assisted ?? 0;
  const correct = score.correct + assisted;
  const hints = score.hints ?? 0;

  return <>
    {level === 'strong' && <EvaluationConfetti/>}
    <header className="lumar-card evaluation-summary-hero" data-level={level}>
      <div className="evaluation-summary-heading">
        <p className="evaluation-summary-label">{label}</p>
        <h1 tabIndex={-1} ref={heading}>{title}</h1>
        {subtitle && <p className="evaluation-summary-subtitle">{subtitle}</p>}
        <p>{level === 'strong' ? '¡Buen trabajo! Tu práctica quedó registrada.'
          : 'Tu práctica quedó registrada. Puedes volver a intentarlo cuando quieras.'}</p>
      </div>
      <div className="evaluation-summary-score">
        <strong>{percentage}<span>%</span></strong>
        <span>de aciertos</span>
      </div>
      <EvaluationMascot level={level}/>
      <p className="evaluation-totals"><strong>{correct} de {correct + score.errors}</strong>
        {' · '}{score.errors} para revisar
        {' · '}{hints} {hints === 1 ? 'pista' : 'pistas'}
        {assisted > 0 && ` · ${assisted} con pista`}
      </p>
    </header>
  </>;
}

export function EvaluationHistoryLink() {
  return <a className="button button--secondary lumar-link" href="#progreso/practicas">
    <History size={17} aria-hidden="true"/> Ver mis prácticas
  </a>;
}
