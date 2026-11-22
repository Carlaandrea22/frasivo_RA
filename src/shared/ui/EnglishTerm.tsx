import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { canPronounce, playPronunciation } from '../audio/pronunciacion';
import { Button } from './Button';
import './english-term.css';

export function EnglishTerm({ term, variant }: { term: string; variant?: 'compact' | 'button' }) {
  const [error, setError] = useState(false);
  const sound = <Button variant="sound" aria-label={`Escuchar ${term}`} disabled={!canPronounce(term)} onClick={() => {
    setError(false);
    playPronunciation(term, () => setError(true));
  }}><Volume2 size={variant ? 17 : 18} aria-hidden="true"/></Button>;
  const status = error && <span role="status">No se pudo reproducir la pronunciación. Inténtalo de nuevo.</span>;

  if (variant === 'compact') return <span className="lumar-english lumar-english--compact">
    <small lang="en">{term}</small>{sound}{status}
  </span>;
  if (variant === 'button') return <span className="lumar-english-button">{sound}{status}</span>;
  return <div className="lumar-english"><span lang="en">{term}</span>{sound}{status}</div>;
}
