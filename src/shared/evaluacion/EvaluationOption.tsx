import { Check, Circle } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { Button } from '../ui/Button';
import { EnglishTerm } from '../ui/EnglishTerm';
import './evaluacion.css';

export function EvaluationOption({ children, pronunciation, ...props }: ComponentPropsWithoutRef<'button'> & {
  pronunciation?: string;
}) {
  const selected = props['aria-pressed'];
  const option = <Button {...props} variant="answer" className="evaluation-option">
    {selected !== undefined && <span className="evaluation-option-marker" aria-hidden="true">
      {selected ? <Check size={15}/> : <Circle size={15}/>}
    </span>}
    <span className="evaluation-option-copy">{children}</span>
  </Button>;
  return pronunciation ? <span className="evaluation-option-with-audio">
    {option}<EnglishTerm key={pronunciation} term={pronunciation} variant="button"/>
  </span> : option;
}
