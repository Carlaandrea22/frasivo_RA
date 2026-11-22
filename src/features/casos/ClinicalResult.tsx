import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, Check, RotateCcw } from 'lucide-react';
import type { ClinicalCase } from '../../content/casos/sessionTypes';
import type { PracticeSessionMode } from '../../shared/progreso';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { isPerfectWithoutHints, performanceLevel } from './clinicalEngine';
import { EvaluationConfetti } from '../../shared/evaluacion/EvaluationConfetti';

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
  mode: PracticeSessionMode;
  submitTimed?: (score: Score) => boolean;
}

export function CaseResult({ title, children, score, retried, markRetry, last, onComplete, onRetry, submitTimed, mode,
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
  const [revealed, setRevealed] = useState(false);
  const canRetry = mode === 'entrenamiento' && !submitTimed && score.errors > 0 && !revealed;
  const heading = useRef<HTMLHeadingElement>(null);
  const solutionHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (revealed) solutionHeading.current?.focus(); }, [revealed]);
  return <Card className="clinical-result" data-level={level}>
    {!submitTimed && isPerfectWithoutHints({ ...score, retried }) && <EvaluationConfetti/>}
    <span className="clinical-result-icon" aria-hidden="true">
      {level === 'strong' ? <Check size={24}/> : <AlertCircle size={24}/>}
    </span>
    <h2 tabIndex={-1} ref={heading}>{title}</h2>
    {retried && <p className="clinical-result-meta">Resultado del reintento</p>}
    {children}
    {solution && !canRetry && <section className="clinical-debrief">
      <h3 ref={solutionHeading} tabIndex={-1}>Corrección</h3>
      {revealed && <p className="clinical-result-meta">Solución revelada. Este intento quedó cerrado.</p>}
      <div>{solution}</div>
    </section>}
    {canRetry && solution && <p className="clinical-result-meta">Elige si quieres reintentar o terminar este intento y ver la solución.</p>}
    <div className="clinical-result-actions">
      {canRetry && <Button variant="secondary" onClick={() => {
        markRetry();
        onRetry();
        window.scrollTo(0, 0);
      }}>
        <RotateCcw size={17} aria-hidden="true"/> {retryLabel}
      </Button>}
      {canRetry && solution && <Button variant="text" onClick={() => setRevealed(true)}>{solutionLabel}</Button>}
      <Button onClick={() => onComplete({ ...score, retried })}>
        {submitTimed ? 'Terminar práctica' : last ? 'Ver resultados' : 'Siguiente caso'} <ArrowRight size={17}/>
      </Button>
    </div>
  </Card>;
}
