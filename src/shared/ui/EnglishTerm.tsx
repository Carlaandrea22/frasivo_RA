import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from './Button';

export function EnglishTerm({ term }: { term: string }) {
  const [error, setError] = useState(false);
  return <div className="lumar-english">
    <span lang="en">{term}</span>
    <Button variant="sound" aria-label={`Escuchar ${term}`} disabled={!('speechSynthesis' in window)} onClick={() => {
      const synthesis = window.speechSynthesis;
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = 'en-US';
      utterance.rate = .82;
      setError(false);
      utterance.onerror = event => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') setError(true);
      };
      synthesis.speak(utterance);
    }}><Volume2 size={18} aria-hidden="true"/></Button>
    {error && <span role="status">La voz inglesa no está disponible en este dispositivo.</span>}
  </div>;
}
