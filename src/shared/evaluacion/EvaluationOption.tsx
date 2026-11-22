import { Check, Circle } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { Button } from '../ui/Button';
import './evaluacion.css';

export function EvaluationOption({ children, ...props }: ComponentPropsWithoutRef<'button'>) {
  const selected = props['aria-pressed'];
  return <Button {...props} variant="answer" className="evaluation-option">
    {selected !== undefined && <span className="evaluation-option-marker" aria-hidden="true">
      {selected ? <Check size={15}/> : <Circle size={15}/>}
    </span>}
    <span className="evaluation-option-copy">{children}</span>
  </Button>;
}
