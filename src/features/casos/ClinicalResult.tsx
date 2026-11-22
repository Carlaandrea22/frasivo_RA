import type { ReactNode } from 'react';
import { AlertCircle, ArrowRight, Check } from 'lucide-react';
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
  investigation?: { questionIds: readonly string[]; hypothesisId: string };
}

export interface CaseStepProps<T extends ClinicalCase> {
  item: T;
  onComplete: (score: Score) => void;
  last: boolean;
}

export function NextCaseButton({ onComplete, score, last }: Pick<CaseStepProps<ClinicalCase>, 'onComplete' | 'last'> & { score: Score }) {
  return <Button onClick={() => onComplete(score)}>{last ? 'Ver resultados' : 'Siguiente caso'} <ArrowRight size={17}/></Button>;
}

export function ResultCard({ title, children, score }: { title: string; children: ReactNode; score: Score }) {
  const level = performanceLevel(score);
  return <Card className="clinical-result" data-level={level}>
    {isPerfectWithoutHints(score) && <ClinicalConfetti/>}
    <span className="clinical-result-icon" aria-hidden="true">
      {level === 'strong' ? <Check size={24}/> : <AlertCircle size={24}/>}
    </span>
    <h2>{title}</h2>
    {children}
  </Card>;
}
