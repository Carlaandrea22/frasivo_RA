import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, ScanLine, X } from 'lucide-react';
import type { Group } from 'three';
import { Button } from '../../shared/ui/Button';
import { BoneLabels, mainBoneIds, type BoneTarget } from './BoneLabels';
import type { BodyPoint } from './anatomy';
import type { CameraFraming } from './cameraFraming';
import type { PrecisePose } from './poseCapture';
import { chooseSpaceMode } from './spaceMode';

const AndroidSpace = lazy(() => import('./AndroidSpace').then(module => ({ default: module.AndroidSpace })));
const SkeletonViewer = lazy(() => import('./SkeletonViewer'));
const CameraSkeleton = lazy(() => import('./CameraSkeleton'));
const arImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const noXR = 'La realidad aumentada requiere Chrome y Servicios de Google Play para RA (ARCore) en un Android compatible. Puedes ver el esqueleto en 3D.';

type LabelChoice = 'none' | 'touched' | 'main';

export default function FixedSkeleton({ pose, framing, cameraHost, touched, onRelease, stopCamera, startCamera, projection, onOverlayReady }: {
  pose: BodyPoint[]; framing: CameraFraming; cameraHost: HTMLDivElement | null; touched: string[];
  onRelease: () => void; stopCamera: () => void; startCamera: () => Promise<void>;
  projection: PrecisePose | null; onOverlayReady: () => void;
}) {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(navigator.userAgent);
  const mode = chooseSpaceMode({ ios, android, webxr: Boolean(navigator.xr) });
  const [quickLook] = useState(() => ios && document.createElement('a').relList.supports?.('ar') === true);
  const [model, setModel] = useState<Group>();
  const [arUrl, setArUrl] = useState('');
  const [error, setError] = useState('');
  const [arFailed, setArFailed] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [androidNotice, setAndroidNotice] = useState('');
  const [choice, setChoice] = useState<LabelChoice>('touched');
  const [picked, setPicked] = useState<Record<string, string>>(() => Object.fromEntries(touched.map(id => [id, id])));
  const [selected, setSelected] = useState('');
  const [targets, setTargets] = useState<BoneTarget[]>([]);
  const [showAll, setShowAll] = useState(false);
  const openedQuickLook = useRef(false);
  const controls = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  useEffect(() => {
    if ((!projection && mode !== 'camera') || !controls.current) return;
    const panel = controls.current;
    const observer = new ResizeObserver(() => {
      setPanelHeight(window.matchMedia('(max-width: 760px)').matches ? panel.offsetHeight+12 : 0);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, [mode, projection]);

  useEffect(() => {
    let discarded = false;
    let skeleton: Group | undefined;
    let dispose: ((model: Group) => void) | undefined;
    void (async () => {
      try {
        const { loadPosedSkeleton, disposeSkeleton } = await import('./posedSkeleton');
        if (discarded) return;
        dispose = disposeSkeleton;
        skeleton = await loadPosedSkeleton(pose);
        if (discarded) { dispose(skeleton); return; }
        setModel(skeleton);
      } catch {
        if (!discarded) setError('No se pudo armar el esqueleto. Suelta la pose y vuelve a intentarlo.');
      }
    })();
    return () => {
      discarded = true;
      if (skeleton) dispose?.(skeleton);
    };
  }, [pose]);

  const labelKey = (choice === 'main' ? mainBoneIds : choice === 'touched' ? Object.values(picked) : []).join('|');
  useEffect(() => {
    if (!model || !quickLook) return;
    let stopped = false;
    let url = '';
    setArUrl('');
    setArFailed(false);
    void import('./posedSkeleton').then(({ exportSkeleton }) =>
      exportSkeleton(model, labelKey ? labelKey.split('|') : []),
    ).then(blob => {
      if (stopped) return;
      url = URL.createObjectURL(blob);
      setArUrl(url);
    }).catch(() => { if (!stopped) setArFailed(true); });
    return () => {
      stopped = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [model, quickLook, labelKey]);

  useEffect(() => {
    function resumeCamera() {
      if (document.hidden || !openedQuickLook.current) return;
      openedQuickLook.current = false;
      if (!cameraHost) void startCamera();
    }
    document.addEventListener('visibilitychange', resumeCamera);
    window.addEventListener('pageshow', resumeCamera);
    return () => {
      document.removeEventListener('visibilitychange', resumeCamera);
      window.removeEventListener('pageshow', resumeCamera);
    };
  }, [cameraHost, startCamera]);

  function remember(id: string, node?: string) {
    if (id) setPicked(previous => previous[id] === (node ?? id) ? previous : { ...previous, [id]: node ?? id });
  }

  const preparingAR = quickLook && !arFailed && !arUrl;
  return <>
    {(mode === 'camera' || projection) && model && !viewer && cameraHost && createPortal(
      <Suspense fallback={null}>
        <CameraSkeleton model={model} framing={framing} selected={selected} projection={projection}
          allowMotion={mode === 'camera'} onReady={onOverlayReady}
          onPick={(id, _x, _y, node) => { setSelected(id); remember(id, node); }} onProject={setTargets}/>
        <BoneLabels targets={targets} selected={selected} showAll={showAll} reservedBottom={panelHeight}/>
      </Suspense>, cameraHost,
    )}
    {viewer && model && (
      <section className="anatomy-fixed-stage" aria-label="Visor del esqueleto 3D" data-bones={model.children.length}>
        <div className="anatomy-viewer-header">
          <h2>Esqueleto 3D</h2>
          <Button variant="text" aria-label="Cerrar visor 3D" onClick={() => setViewer(false)}><X size={18} aria-hidden="true"/></Button>
        </div>
        <Suspense fallback={<p className="anatomy-viewer-note" role="status">Abriendo visor…</p>}>
          <SkeletonViewer model={model} onPicked={remember}/>
        </Suspense>
      </section>
    )}
    <div className="anatomy-controls anatomy-fixed-controls" ref={controls}>
      {mode === 'camera' && model && <div className="anatomy-ios-options">
        {quickLook && <label>Etiquetas para el visor de Apple
          <select value={choice} onChange={event => setChoice(event.target.value as LabelChoice)}>
            <option value="none">Sin etiquetas</option>
            <option value="touched">Huesos que toqué</option>
            <option value="main">Etiquetas principales</option>
          </select>
        </label>}
        {!viewer && <Button variant="secondary" aria-pressed={showAll} onClick={() => setShowAll(value => !value)}>Etiquetas</Button>}
        {!cameraHost && <Button variant="secondary" onClick={() => { void startCamera(); }}>Reactivar cámara</Button>}
      </div>}
      <div className="anatomy-fixed-actions">
        {mode === 'webxr' && model ? (
          <Suspense fallback={<Button disabled>Preparando AR…</Button>}>
            <AndroidSpace model={model} beforeEnter={stopCamera} onExit={() => { void startCamera(); }}
              onFallback={message => { setAndroidNotice(message); setViewer(true); }}/>
          </Suspense>
        ) : arUrl ? (
          <a className="button button--primary" rel="ar" href={arUrl + '#allowsContentScaling=0'}
            download="esqueleto.usdz" aria-label="Ver en mi espacio" onClick={() => { openedQuickLook.current = true; }}>
            <img src={arImage} alt=""/>
          </a>
        ) : (
          <Button disabled={!model || preparingAR} onClick={() => {
            if (android) setAndroidNotice(noXR);
            setViewer(true);
          }}><ScanLine size={17} aria-hidden="true"/> {model && preparingAR ? 'Preparando AR…' : 'Ver en mi espacio'}</Button>
        )}
        <Button variant="secondary" disabled={!model} onClick={() => setViewer(true)}>
          <Box size={17} aria-hidden="true"/> Ver en 3D
        </Button>
        <Button variant="text" onClick={onRelease}>Soltar</Button>
      </div>
      {mode === 'camera' && <p className="anatomy-note">Al caminar, el esqueleto pierde su posición sobre la cámara. {quickLook && 'En iPhone, «Ver en mi espacio» abre el visor AR de Apple.'}</p>}
      {androidNotice && <p className="anatomy-note" role="status">{androidNotice}</p>}
      {arFailed && <p className="anatomy-note" role="status">AR no está disponible para esta captura. Puedes verla en 3D.</p>}
      {error && <p className="anatomy-error" role="alert">{error}</p>}
      {!model && !error && <p className="anatomy-note">Preparando esqueleto…</p>}
    </div>
  </>;
}
