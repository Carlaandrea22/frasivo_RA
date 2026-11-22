import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from '../../shared/ui/Button';

const clips = import.meta.glob('../../content/anatomy/pronunciacion/*.mp3', {
  eager: true, query: '?url&no-inline', import: 'default',
}) as Record<string, string>;
let playing: HTMLAudioElement | undefined;
let playbackRequest = 0;

export function pronunciacionUrl(term: string) {
  const file = term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return clips[`../../content/anatomy/pronunciacion/${file}.mp3`];
}

export function Pronunciacion({ term }: { term: string }) {
  const [error, setError] = useState(false);
  const url = pronunciacionUrl(term);
  return <div className="lumar-english">
    <span lang="en-US">{term}</span>
    <Button variant="sound" aria-label={`Escuchar ${term}`} disabled={!url} onClick={() => {
      if (!url) return;
      const request = ++playbackRequest;
      setError(false);
      playing?.pause();
      const audio = new Audio(url);
      playing = audio;
      void audio.play().catch(() => {
        if (request === playbackRequest) setError(true);
      });
    }}><Volume2 size={18} aria-hidden="true"/></Button>
    {error && <span role="status">No se pudo reproducir el audio. Inténtalo de nuevo.</span>}
  </div>;
}
