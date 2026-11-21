import { useEffect, useState, type CSSProperties } from 'react';
import { Bone, Camera, Dumbbell, Heart, ScanLine, Square, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { AnatomyOverlay } from './AnatomyOverlay';
import { anatomyParts, demoPose, type AnatomyLayer } from './anatomy';
import { usePoseCamera } from './usePoseCamera';
import './medicine.css';

const layers = [
  { id: 'bones', name: 'Huesos', icon: Bone },
  { id: 'muscles', name: 'Músculos', icon: Dumbbell },
  { id: 'organs', name: 'Órganos', icon: Heart },
] satisfies { id: AnatomyLayer; name: string; icon: typeof Bone }[];

export default function MedicineExplorer() {
  const [layer, setLayer] = useState<AnatomyLayer>('bones');
  const [selected, setSelected] = useState('skull');
  const [opacity, setOpacity] = useState(85);
  const [audioError, setAudioError] = useState(false);
  const camera = usePoseCamera();
  const live = camera.status === 'active';
  const waiting = camera.status === 'permission';
  const parts = anatomyParts.filter(part => part.layer === layer);
  const term = parts.find(part => part.id === selected) ?? parts[0];
  const status = waiting ? 'Esperando permiso' : !live ? 'Demostración'
    : camera.tracking === 'loading' ? 'Preparando seguimiento'
    : camera.tracking === 'tracking' ? 'Persona detectada' : 'Buscando una persona';

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

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

  return (
    <section className="body-explorer" aria-label="Cámara corporal">
      <div className="anatomy-stage">
        <div className="anatomy-stage-header">
          <span className="anatomy-mode"><ScanLine size={17} aria-hidden="true"/> Atlas corporal</span>
          <span className="anatomy-status" role="status"><i aria-hidden="true"/>{status}</span>
        </div>
        <div className="anatomy-window">
          <div className="anatomy-frame" style={{ '--frame-ratio': live ? camera.aspect : .8 } as CSSProperties}>
            <video ref={camera.videoRef} autoPlay playsInline muted aria-label="Vista de la cámara" className={live ? 'visible' : ''}/>
            {!live && !waiting && (
              <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="anatomy-silhouette" aria-hidden="true">
                <ellipse cx="500" cy="120" rx="62" ry="64"/>
                <path d="M465 175V210Q390 210 365 244L275 402L220 562Q230 585 260 565L324 420L390 315L405 530L365 937Q380 963 407 943L475 642H525L593 943Q620 963 635 937L595 530L610 315L676 420L740 565Q770 585 780 562L725 402L635 244Q610 210 535 210V175Z"/>
              </svg>
            )}
            <AnatomyOverlay
              points={live ? camera.points : waiting ? [] : demoPose}
              layer={layer}
              selected={term.id}
              opacity={opacity / 100}
            />
          </div>
        </div>
        <p className="anatomy-stage-hint">
          {live ? 'Encuadra a una persona de frente' : 'Vista ilustrada · frontal'}
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

        <details className="anatomy-vocabulary">
          <summary>Vocabulario de la capa</summary>
          <div className="anatomy-part-list" role="group" aria-label="Estructuras ilustradas">
            {parts.map(part => (
              <Button key={part.id} variant="text" aria-pressed={part.id === term.id} onClick={() => {
                setSelected(part.id);
                setAudioError(false);
              }}>
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
          <p>{term.description}</p>
          {audioError && <p role="status">La voz inglesa no está disponible en este dispositivo.</p>}
        </details>

        <p className="anatomy-note">Las ilustraciones muestran ubicaciones aproximadas. La cámara se procesa en tu dispositivo.</p>
      </div>
    </section>
  );
}
