import { useEffect } from 'react';
import { stopPronunciation } from '../audio/pronunciacion';

export function useEvaluationPronunciation(step?: string | number) {
  useEffect(() => stopPronunciation, [step]);
}
