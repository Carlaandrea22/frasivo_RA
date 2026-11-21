import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Bone, BookOpen, Camera, ChevronUp, Dumbbell, Heart, ScanLine, Square, Volume2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { AnatomyOverlay } from './AnatomyOverlay';
import { anatomyParts, type AnatomyLayer } from './anatomy';
import { comparisonTechnique, type Technique } from './atlasAlignment';
import { usePoseCamera } from './usePoseCamera';
import './medicine.css';

const layers = [
  { id: 'bones', name: 'Huesos', icon: Bone },
  { id: 'muscles', name: 'Músculos', icon: Dumbbell },
  { id: 'organs', name: 'Órganos', icon: Heart },
] satisfies { id: AnatomyLayer; name: string; icon: typeof Bone }[];

const compactViewport = '(max-width: 760px)';

function subscribeViewport(notify: () => void) {
  const media = window.matchMedia(compactViewport);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}

function isCompactViewport() {
  return window.matchMedia(compactViewport).matches;
}

export default function MedicineExplorer() {
  const [layer, setLayer] = useState<AnatomyLayer>('bones');
  const [selected, setSelected] = useState('skull');
  const [opacity, setOpacity] = useState(85);
  const [audioError, setAudioError] = useState(false);
  const [comparison] = useState(() => comparisonTechnique(window.location.search));
  const [technique, setTechnique] = useState<Technique>(comparison ?? 'a');
  const [fps, setFps] = useState<number | null>(null);
  const frameSample = useRef({ started: 0, count: 0 });
  const compact = useSyncExternalStore(subscribeViewport, isCompactViewport);
  const vocabularySheet = useRef<HTMLDialogElement>(null);
  const camera = usePoseCamera();
  const live = camera.status === 'active';
  const waiting = camera.status === 'permission';
  const aspect = live ? camera.aspect : .8;
  const parts = anatomyParts.filter(part => part.layer === layer);
  const term = parts.find(part => part.id === selected) ?? parts[0];
  const status = waiting ? 'Esperando permiso' : !live ? 'Demostración'
    : camera.tracking === 'loading' ? 'Preparando seguimiento'
    : camera.tracking === 'tracking' ? 'Persona detectada' : 'Buscando una persona';

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    frameSample.current = { started: 0, count: 0 };
    setFps(null);
  }, [technique, layer, live]);

  const recordFrame = useCallback(() => {
    const now = performance.now();
    const sample = frameSample.current;
    if (!sample.started) sample.started = now;
    const elapsed = now - sample.started;
    if (elapsed >= 1000) {
      setFps(Math.round(sample.count * 1000 / elapsed));
      frameSample.current = { started: now, count: 1 };
    } else sample.count++;
  }, []);

  function changeTechnique(next: Technique) {
    const url = new URL(window.location.href);
    url.searchParams.set('tecnica', next);
    window.history.replaceState(null, '', url);
    setTechnique(next);
  }

  function selectPart(id: string) {
    setSelected(id);
    setAudioError(false);
  }

  function speak() {
    const synthesis = window.speechSynthesis;
    if (!synthesis) return;
    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(term.en);
    utterance.lang = 'en-US';
    utterance.rate = .82;
    setAudioError(false);
    utterance.onerror = event => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') setAudioError(true);
    };
    synthesis.speak(utterance);
  }

  const vocabulary = (
    <>
      <div className="anatomy-part-list" role="group" aria-label="Estructuras ilustradas">
        {parts.map(part => (
          <Button key={part.id} variant="text" aria-pressed={part.id === term.id} onClick={() => selectPart(part.id)}>
            {part.es}
          </Button>
        ))}
      </div>
      <div className="anatomy-definition">
        <div>
          <h2 lang="en">{term.en}</h2>
          <p>{term.es}</p>
        </div>
        <Button variant="sound" aria-label={`Escuchar ${term.en}`} disabled={!window.speechSynthesis} onClick={speak}>
          <Volume2 size={20} aria-hidden="true"/>
        </Button>
      </div>
          <p lang="en">{term.description}</p>
      {audioError && <p role="status">La voz inglesa no está disponible en este dispositivo.</p>}
    </>
  );

  const privacyNote = <p className="anatomy-note">Las ilustraciones muestran ubicaciones aproximadas. La cámara se procesa en tu dispositivo.</p>;

  return (
    <section className="body-explorer" aria-label="Cámara corporal">
      <div className={live ? 'anatomy-stage anatomy-stage--live' : 'anatomy-stage'}>
        <div className="anatomy-stage-header">
          <span className="anatomy-mode"><ScanLine size={17} aria-hidden="true"/> Atlas corporal</span>
          <span className="anatomy-status" role="status"><i aria-hidden="true"/>{status}</span>
        </div>
        <div className="anatomy-window">
          <div className="anatomy-frame" style={{ '--frame-ratio': aspect } as CSSProperties}>
            <video ref={camera.videoRef} autoPlay playsInline muted aria-label="Vista de la cámara" className={live ? 'visible' : ''}/>
            {!waiting && <AnatomyOverlay
              key={layer}
              points={live ? camera.points : null}
              layer={layer}
              aspect={aspect}
              selected={term.id}
              focusSelection={selected === term.id}
              opacity={opacity / 100}
              technique={technique}
              onSelect={selectPart}
              onFrame={comparison && live && camera.tracking === 'tracking' ? recordFrame : undefined}
            />}
          </div>
        </div>
        {comparison && layer === 'bones' && (
          <div className="anatomy-techniques" role="group" aria-label="Técnica de huesos">
            <Button variant="secondary" aria-pressed={technique === 'a'} onClick={() => changeTechnique('a')}>A · Imágenes</Button>
            <Button variant="secondary" aria-pressed={technique === 'b'} onClick={() => changeTechnique('b')}>B · 3D</Button>
            {live && camera.tracking === 'tracking' && <span className="anatomy-fps" data-fps={fps ?? undefined}>{fps ?? '–'} fps</span>}
          </div>
        )}
        <p className="anatomy-stage-hint">
          {waiting || (live && camera.tracking !== 'tracking')
            ? 'Encuadra a una persona de frente'
            : <span className="anatomy-active-term" lang="en">{term.en}</span>}
        </p>
      </div>

      <div className="anatomy-controls">
        <div className="anatomy-intro">
          <h1>Explora el cuerpo</h1>
          <p>Elige una capa y apunta la cámara a una persona de frente.</p>
        </div>

        <div className="anatomy-layers" role="group" aria-label="Capa anatómica">
          {layers.map(({ id, name, icon: Icon }) => (
            <Button key={id} variant="secondary" aria-pressed={layer === id} onClick={() => {
              setLayer(id);
              setAudioError(false);
            }}>
              <Icon size={17} aria-hidden="true"/>
              {name}
            </Button>
          ))}
        </div>

        <div className="anatomy-actions">
          <Button variant={live || waiting ? 'secondary' : 'primary'} onClick={() => {
            if (live || waiting) camera.stop();
            else void camera.start();
          }}>
            {live || waiting ? <Square size={15} aria-hidden="true"/> : <Camera size={18} aria-hidden="true"/>}
            {waiting ? 'Cancelar cámara' : live ? 'Detener cámara' : 'Activar cámara'}
          </Button>
          <div className="anatomy-opacity">
            <label htmlFor="body-opacity">Opacidad</label>
            <output htmlFor="body-opacity" aria-hidden="true">{opacity}%</output>
            <input id="body-opacity" type="range" min="20" max="100" step="5" value={opacity} onChange={event => setOpacity(Number(event.target.value))}/>
          </div>
        </div>

        {(camera.error || camera.modelError) && <p className="anatomy-error" role="alert">{camera.error || camera.modelError}</p>}

        {compact ? (
          <>
            <Button
              className="anatomy-vocabulary-trigger"
              variant="text"
              aria-haspopup="dialog"
              onClick={event => {
                event.currentTarget.focus();
                vocabularySheet.current?.showModal();
              }}
            >
              <BookOpen size={18} aria-hidden="true"/>
              <span>Vocabulario de la capa</span>
              <ChevronUp size={18} aria-hidden="true"/>
            </Button>
            <dialog ref={vocabularySheet} className="anatomy-sheet" aria-labelledby="anatomy-sheet-title">
              <div className="anatomy-sheet-header">
                <h2 id="anatomy-sheet-title">Vocabulario de la capa</h2>
                <Button variant="text" aria-label="Cerrar vocabulario" onClick={() => vocabularySheet.current?.close()}>
                  <X size={20} aria-hidden="true"/>
                </Button>
              </div>
              <div className="anatomy-vocabulary">{vocabulary}</div>
              {privacyNote}
            </dialog>
          </>
        ) : (
          <>
            <details className="anatomy-vocabulary">
              <summary>Vocabulario de la capa</summary>
              {vocabulary}
            </details>
            {privacyNote}
          </>
        )}
      </div>
    </section>
  );
}
