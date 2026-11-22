import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { canPronounce, playPronunciation } from '../audio/pronunciacion';
import { Button } from './Button';

export function EnglishTerm({ term }: { term: string }) {
  const [error, setError] = useState(false);
  return <div className="lumar-english">
    <span lang="en">{term}</span>
    <Button variant="sound" aria-label={`Escuchar ${term}`} disabled={!canPronounce(term)} onClick={() => {
      setError(false);
      playPronunciation(term, () => setError(true));
    }}><Volume2 size={18} aria-hidden="true"/></Button>
    {error && <span role="status">No se pudo reproducir la pronunciación. Inténtalo de nuevo.</span>}
  </div>;
}
