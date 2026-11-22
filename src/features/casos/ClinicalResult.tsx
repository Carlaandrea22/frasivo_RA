import type { ReactNode } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { performanceLevel } from './clinicalEngine';

export interface Score {
  correct: number;
  errors: number;
  hints?: number;
  assisted?: number;
  investigation?: { questionIds: readonly string[]; hypothesisId: string };
}

export function NextCaseButton({ onComplete, score }: { onComplete: (score: Score) => void; score: Score }) {
  return <Button onClick={() => onComplete(score)}>Siguiente caso</Button>;
}

export function ResultCard({ title, children, score }: { title: string; children: ReactNode; score: Score }) {
  const level = performanceLevel(score);
  return <Card className="clinical-result" data-level={level}>
    <span className="clinical-result-icon" aria-hidden="true">
      {level === 'strong' ? <Check size={24}/> : <AlertCircle size={24}/>}
    </span>
    <h2>{title}</h2>
    {children}
  </Card>;
}
