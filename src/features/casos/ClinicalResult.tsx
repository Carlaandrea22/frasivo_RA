import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, Check, RotateCcw } from 'lucide-react';
import type { ClinicalCase } from '../../content/casos/sessionTypes';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { isPerfectWithoutHints, performanceLevel } from './clinicalEngine';
import { ClinicalConfetti } from './ClinicalConfetti';

export interface Score {
  correct: number;
  errors: number;
  hints?: number;
  assisted?: number;
  retried?: boolean;
  investigation?: { questionIds: readonly string[]; hypothesisId: string };
}

export interface CaseStepProps<T extends ClinicalCase> {
  item: T;
  onComplete: (score: Score) => void;
  last: boolean;
  retried: boolean;
  markRetry: () => void;
}

export function CaseResult({ title, children, score, retried, markRetry, last, onComplete, onRetry,
  retryLabel = 'Reintentar', solution, solutionLabel = 'Ver respuesta correcta' }: Omit<CaseStepProps<ClinicalCase>, 'item'> & {
  title: string;
  children?: ReactNode;
  score: Score;
  onRetry: () => void;
  retryLabel?: string;
  solution?: ReactNode;
  solutionLabel?: string;
}) {
  const level = performanceLevel(score);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <Card className="clinical-result" data-level={level}>
    {isPerfectWithoutHints({ ...score, retried }) && <ClinicalConfetti/>}
    <span className="clinical-result-icon" aria-hidden="true">
      {level === 'strong' ? <Check size={24}/> : <AlertCircle size={24}/>}
    </span>
    <h2 tabIndex={-1} ref={heading}>{title}</h2>
    {retried && <p className="clinical-result-meta">Resultado del reintento</p>}
    {children}
    {solution && <details className="clinical-debrief" open={score.errors === 0}>
      <summary>{solutionLabel}</summary>
      <div>{solution}</div>
    </details>}
    <div className="clinical-result-actions">
      {score.errors > 0 && <Button variant="secondary" onClick={() => {
        markRetry();
        onRetry();
        window.scrollTo(0, 0);
      }}>
        <RotateCcw size={17} aria-hidden="true"/> {retryLabel}
      </Button>}
      <Button onClick={() => onComplete({ ...score, retried })}>{last ? 'Ver resultados' : 'Siguiente caso'} <ArrowRight size={17}/></Button>
    </div>
  </Card>;
}
