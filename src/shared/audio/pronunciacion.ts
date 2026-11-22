const clips = import.meta.glob('../../content/anatomy/pronunciacion/*.mp3', {
  eager: true, query: '?url&no-inline', import: 'default',
}) as Record<string, string>;

export function pronunciacionUrl(term: string): string | undefined {
  const file = term.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return clips[`../../content/anatomy/pronunciacion/${file}.mp3`];
}

let playing: HTMLAudioElement | undefined;
let request = 0;

export function canPronounce(term: string) {
  return Boolean(pronunciacionUrl(term) || window.speechSynthesis);
}

export function stopPronunciation() {
  request++;
  playing?.pause();
  playing = undefined;
  window.speechSynthesis?.cancel();
}

export function playPronunciation(term: string, onError: () => void) {
  stopPronunciation();
  const current = request;
  const fail = () => { if (current === request) onError(); };
  const url = pronunciacionUrl(term);
  if (url) {
    playing = new Audio(url);
    void playing.play().catch(fail);
    return;
  }

  const synthesis = window.speechSynthesis;
  if (!synthesis) { fail(); return; }
  const utterance = new SpeechSynthesisUtterance(term);
  utterance.lang = 'en-US';
  utterance.rate = .82;
  utterance.onerror = ({ error }) => { if (error !== 'canceled' && error !== 'interrupted') fail(); };
  synthesis.speak(utterance);
}
