import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Bone, BookOpen, Camera, ChevronDown, ChevronUp, Dumbbell, Heart, Pin, Square, Volume2, X } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { AnatomyOverlay } from './AnatomyOverlay';
import { anatomyParts, type AnatomyLayer, type BodyPoint } from './anatomy';
import { atlasPlacement, visibleRegion } from './atlasAlignment';
import FixedSkeleton from './FixedSkeleton';
import type { CameraFraming } from './cameraFraming';
import { capturePrecisePose } from './precisePoseCapture';
import { averagePose, captureIssue } from './poseCapture';
import { usePoseCamera } from './usePoseCamera';
import { useFrameRate } from './useFrameRate';
import './medicine.css';

const layers = [
  { id: 'bones', name: 'Huesos', icon: Bone },
  { id: 'muscles', name: 'Músculos', icon: Dumbbell },
  { id: 'organs', name: 'Órganos', icon: Heart },
] satisfies { id: AnatomyLayer; name: string; icon: typeof Bone }[];

const compactViewport = '(max-width: 760px)';
const controlsStorageKey = 'frasivo.body.controls-minimized';

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
  const [boneSelection, setBoneSelection] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [opacity, setOpacity] = useState(85);
  const [minimized, setMinimized] = useState(() => {
    try { return localStorage.getItem(controlsStorageKey) === 'true'; } catch { return false; }
  });
  const [fixedPose, setFixedPose] = useState<BodyPoint[] | null>(null);
  const [framing, setFraming] = useState<CameraFraming>({ x: .5, y: .5, height: .75 });
  const [touched, setTouched] = useState<string[]>([]);
  const [captureProgress, setCaptureProgress] = useState<number | null>(null);
  const [captureError, setCaptureError] = useState('');
  const pendingCapture = useRef<AbortController>(null);
  const [audioError, setAudioError] = useState(false);
  const [debug] = useState(() => new URLSearchParams(window.location.search).get('debug') === '1');
  const [diagnostics] = useState(() => debug || new URLSearchParams(window.location.search).get('fps') === '1');
  const { fps: detectionFps, record: recordDetection, reset: resetDetection } = useFrameRate();
  const { fps: drawingFps, record: recordDrawing, reset: resetDrawing } = useFrameRate();
  const compact = useSyncExternalStore(subscribeViewport, isCompactViewport);
  const vocabularySheet = useRef<HTMLDialogElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [viewportAspect, setViewportAspect] = useState(.8);
  const camera = usePoseCamera(diagnostics ? recordDetection : undefined, layer === 'bones');
  const live = camera.status === 'active';
  const waiting = camera.status === 'permission';
  const aspect = live ? camera.aspect : .8;
  const points = live ? camera.points : null;
  const placement = useMemo(() => atlasPlacement(points, aspect, live ? viewportAspect : aspect, layer === 'bones'),
    [points, aspect, live, viewportAspect, layer]);
  const parts = anatomyParts.filter(part => part.layer === layer);
  const visibleTerms = new Set(placement.visible.filter(part => part.layer === layer).map(part => part.term));
  const term = parts.find(part => part.id === selected && visibleTerms.has(part.id))
    ?? (live ? undefined : parts[0]);
  const status = fixedPose ? 'Esqueleto fijado' : waiting ? 'Esperando permiso' : !live ? 'Demostración'
    : camera.tracking === 'loading' ? 'Preparando seguimiento'
    : camera.tracking === 'tracking' ? 'Persona detectada' : 'Buscando una persona';
  const poseIssue = captureIssue(camera.samples.at(-1), aspect, viewportAspect, performance.now());
  const canFix = live && !fixedPose && placement.facing === 'front' && !poseIssue;
  useEffect(() => () => pendingCapture.current?.abort(), []);
  useEffect(() => {
    if (!live) pendingCapture.current?.abort();
  }, [live]);
  const adjustment = placement.facing === 'front' ? 'Mantén la pose un momento' : 'Encuadra a la persona de frente';
  const pinReason = live && !fixedPose && !canFix && captureProgress === null
    ? (placement.facing === 'back' || placement.facing === 'side' ? 'Pídele a la persona que se gire de frente'
      : poseIssue || adjustment)
    : '';

  useEffect(() => {
    try { localStorage.setItem(controlsStorageKey, String(minimized)); } catch { /* Storage can be unavailable. */ }
  }, [minimized]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  useEffect(() => {
    const element = windowRef.current!;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setViewportAspect(width / height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    resetDetection();
    resetDrawing();
  }, [live, resetDetection, resetDrawing]);

  const activeTerm = term?.id;
  useEffect(() => {
    if (live && selected && !activeTerm) setSelected('');
  }, [live, selected, activeTerm]);

  function selectPart(id: string) {
    setSelected(id);
    if (layer === 'bones') {
      setBoneSelection(true);
      setTouched(previous => previous.includes(id) ? previous : [...previous, id]);
    }
    setAudioError(false);
  }

  function speak() {
    const synthesis = window.speechSynthesis;
    if (!synthesis || !term) return;
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
          <Button key={part.id} variant="text" aria-pressed={part.id === term?.id}
            disabled={live && !visibleTerms.has(part.id)} onClick={() => selectPart(part.id)}>
            <span lang="en">{part.en}</span>
            <small>{part.es}</small>
          </Button>
        ))}
      </div>
      {term && (
        <>
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
      )}
    </>
  );

  const privacyNote = <p className="anatomy-note">Las ilustraciones muestran ubicaciones aproximadas. La cámara se procesa en tu dispositivo.</p>;
  const cameraButton = (iconOnly = false) => {
    const label = waiting ? 'Cancelar cámara' : live ? 'Detener cámara' : 'Activar cámara';
    return (
      <Button variant={live || waiting ? 'secondary' : 'primary'}
        className={iconOnly ? 'anatomy-icon-button' : undefined} aria-label={label} onClick={() => {
          if (live || waiting) camera.stop();
          else void camera.start();
        }}>
        {live || waiting ? <Square size={15} aria-hidden="true"/> : <Camera size={18} aria-hidden="true"/>}
        {!iconOnly && label}
      </Button>
    );
  };
  const pinButton = (
    <Button disabled={!canFix || captureProgress !== null} aria-describedby={pinReason ? 'anatomy-pin-reason' : undefined} onClick={() => {
      const video = camera.videoRef.current;
      if (!video || pendingCapture.current || captureIssue(camera.samples.at(-1), aspect, viewportAspect, performance.now())) return;
      if (layer !== 'bones') {
        const pose = averagePose(camera.samples, performance.now(), aspect, viewportAspect);
        if (pose) setFixedPose(pose);
        return;
      }
      const sample = camera.samples.at(-1)!.points;
      const [left, top, width, height] = visibleRegion(aspect, viewportAspect);
      const hips = (sample[23].x + sample[24].x)*aspect/2;
      const bottomY = Math.max(...[27, 28, 29, 30, 31, 32].map(index => sample[index].y));
      const eyes = [0, 2, 5, 7, 8].map(index => sample[index]).filter(point => (point.visibility ?? 0) >= .52);
      const headY = Math.min(...eyes.map(point => point.y));
      const startY = headY-(bottomY-headY)*.08;
      setFraming({ x: (hips-left)/width, y: ((startY+bottomY)/2-top)/height, height: (bottomY-startY)/height });
      const controller = new AbortController();
      pendingCapture.current = controller;
      setCaptureError('');
      setCaptureProgress(-1);
      void capturePrecisePose(video, viewportAspect, setCaptureProgress, controller.signal).then(setFixedPose)
        .catch(error => {
          if (!controller.signal.aborted) setCaptureError(error instanceof Error ? error.message : 'No se pudo fijar el esqueleto.');
        }).finally(() => {
          if (pendingCapture.current === controller) {
            pendingCapture.current = null;
            setCaptureProgress(null);
          }
        });
    }}>
      <Pin size={16} aria-hidden="true"/> Fijar esqueleto
    </Button>
  );
  const toggleControls = (
    <Button variant="text" className="anatomy-icon-button" aria-expanded={!minimized}
      aria-label={minimized ? 'Expandir controles' : 'Minimizar controles'} onClick={() => setMinimized(value => !value)}>
      {minimized ? <ChevronUp size={18} aria-hidden="true"/> : <ChevronDown size={18} aria-hidden="true"/>}
    </Button>
  );

  return (
    <section className={`body-explorer${minimized ? ' body-explorer--minimized' : ''}${fixedPose ? ' body-explorer--fixed' : ''}`} aria-label="Cámara corporal">
      <div className={live ? 'anatomy-stage anatomy-stage--live' : 'anatomy-stage'}>
        <div className="anatomy-stage-header">
          <span className="anatomy-status" role="status"><i aria-hidden="true"/>{status}</span>
          {diagnostics && live && !fixedPose && (
            <span className="anatomy-fps">
              <span data-fps-detection={detectionFps ?? undefined}>Pose {detectionFps ?? '–'}</span>
              {' · '}
              <span data-fps-drawing={visibleTerms.size ? drawingFps ?? undefined : 0}>
                Dibujo {visibleTerms.size ? drawingFps ?? '–' : 0}
              </span> fps
            </span>
          )}
          {layer === 'bones' && !waiting && !fixedPose &&
            <Button className="anatomy-label-toggle" variant="secondary" aria-pressed={showLabels}
              onClick={() => setShowLabels(value => !value)}>Etiquetas</Button>}
        </div>
        <div className="anatomy-window" ref={windowRef}>
          <div className="anatomy-frame" style={{ '--frame-ratio': aspect } as CSSProperties}>
            <video ref={camera.videoRef} autoPlay playsInline muted aria-label="Vista de la cámara" className={live ? 'visible' : ''}/>
            {!waiting && !fixedPose && <AnatomyOverlay
              placement={placement}
              live={live}
              layer={layer}
              aspect={aspect}
              selected={layer === 'organs' && !selected ? undefined : activeTerm}
              opacity={opacity / 100}
              onSelect={selectPart}
              onFrame={diagnostics ? recordDrawing : undefined}
              showLabels={showLabels}
              showSelection={boneSelection}
            />}
            {debug && layer === 'bones' && points && !fixedPose && <svg className="anatomy-landmarks" viewBox={`0 0 ${aspect} 1`}
              preserveAspectRatio="xMidYMid slice" aria-label="Puntos de diagnóstico de Pose">
              {points.map((point, i) => <g key={i} data-landmark={i} transform={`translate(${point.x*aspect} ${point.y})`}>
                <circle r=".005" fill={(point.visibility ?? 0) >= .65 ? '#b3ff9c' : '#ffb56d'}/>
                <text x=".008" y="-.006" fontSize=".014" fill="#fff" stroke="#102923" strokeWidth=".003"
                  paintOrder="stroke">{i} {(point.visibility ?? 0).toFixed(2)}</text>
              </g>)}
            </svg>}
          </div>
        </div>
        {captureProgress !== null && <div className="anatomy-capture-ring" role="status">
          {captureProgress >= 0 && <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#536d63" strokeWidth="4"/>
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" pathLength="1"
              strokeDasharray={`${captureProgress} 1`} transform="rotate(-90 24 24)"/>
          </svg>}
          {captureProgress < 0 ? 'Preparando captura precisa…' : 'Quédate quieto 1 segundo'}
        </div>}
        {captureError && <p className="anatomy-capture-ring" role="alert">{captureError}</p>}
        {!fixedPose && (term || pinReason) && <p className="anatomy-stage-hint">
          {pinReason && <span id="anatomy-pin-reason">{pinReason}</span>}
          {term && <span className="anatomy-active-term" lang="en">{term.en}</span>}
        </p>}
      </div>

      {fixedPose ? <FixedSkeleton pose={fixedPose} framing={framing} cameraHost={live ? windowRef.current : null}
        touched={touched} onRelease={() => setFixedPose(null)} stopCamera={camera.stop} startCamera={camera.start}/>
      : minimized ? (
        <div className="anatomy-controls anatomy-controls--minimized">
          <span className="anatomy-current-layer">{layers.find(item => item.id === layer)?.name}</span>
          {live ? pinButton : cameraButton()}
          {toggleControls}
          {(camera.error || camera.modelError) && <p className="anatomy-error" role="alert">{camera.error || camera.modelError}</p>}
        </div>
      ) : (
        <div className="anatomy-controls">
          <div className="anatomy-intro">
            <h1>Explora el cuerpo</h1>
            <p>Elige una capa y apunta la cámara a una persona de frente.</p>
          </div>

          <div className="anatomy-layer-row">
            <div className="anatomy-layers" role="group" aria-label="Capa anatómica">
              {layers.map(({ id, name, icon: Icon }) => (
                <Button key={id} variant="secondary" aria-pressed={layer === id} onClick={() => {
                  setLayer(id);
                  setSelected('');
                    setBoneSelection(false);
                  setAudioError(false);
                }}>
                  <Icon size={17} aria-hidden="true"/>
                  {name}
                </Button>
              ))}
            </div>
            {toggleControls}
          </div>

          <div className={live ? 'anatomy-actions anatomy-actions--live' : 'anatomy-actions'}>
            {live && pinButton}
            {cameraButton(live)}
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
      )}
    </section>
  );
}
