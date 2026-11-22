import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, ScanLine, X } from 'lucide-react';
import type { Group } from 'three';
import { Button } from '../../shared/ui/Button';
import { BoneLabels, mainAnatomyIds, type BoneTarget } from './BoneLabels';
import type { AnatomyLayer, BodyPoint } from './anatomy';
import type { CameraFraming } from './cameraFraming';
import { FixedLayerButtons } from './FixedLayerButtons';
import type { PrecisePose } from './poseCapture';
import { chooseSpaceMode } from './spaceMode';

const AndroidSpace = lazy(() => import('./AndroidSpace').then(module => ({ default: module.AndroidSpace })));
const SkeletonViewer = lazy(() => import('./SkeletonViewer'));
const CameraSkeleton = lazy(() => import('./CameraSkeleton'));
const arImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const noXR = 'La realidad aumentada requiere Chrome y Servicios de Google Play para RA (ARCore) en un Android compatible. Puedes ver la captura en 3D.';

type LabelChoice = 'none' | 'touched' | 'main';
type LayerModels = Partial<Record<AnatomyLayer, Group>>;
const alternateLayers = ['muscles', 'organs'] as const;
const viewerNames = { bones: 'Esqueleto 3D', muscles: 'Músculos 3D', organs: 'Órganos 3D' };
const quickLookFiles = { bones: 'esqueleto.usdz', muscles: 'musculos.usdz', organs: 'organos.usdz' };
const layerErrors = { muscles: 'No se pudo cargar la capa de músculos.', organs: 'No se pudo cargar la capa de órganos.' };

export default function FixedSkeleton({
  pose, framing, cameraHost, touched, onRelease, stopCamera, startCamera, projection, onOverlayReady, layer, onLayerChange,
}: {
  pose: BodyPoint[]; framing: CameraFraming; cameraHost: HTMLDivElement | null; touched: string[];
  onRelease: () => void; stopCamera: () => void; startCamera: () => Promise<void>;
  projection: PrecisePose | null; onOverlayReady: () => void;
  layer: AnatomyLayer; onLayerChange: (layer: AnatomyLayer) => void;
}) {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(navigator.userAgent);
  const mode = chooseSpaceMode({ ios, android, webxr: Boolean(navigator.xr) });
  const [quickLook] = useState(() => ios && document.createElement('a').relList.supports?.('ar') === true);
  const [loaded, setLoaded] = useState<{ pose: BodyPoint[]; models: LayerModels }>();
  const models = loaded?.pose === pose ? loaded.models : {};
  const model = models[layer];
  const available = Object.keys(models) as AnatomyLayer[];
  const [appleExport, setAppleExport] = useState<{ model: Group; labels: string; url: string | false }>();
  const [error, setError] = useState('');
  const [viewer, setViewer] = useState(false);
  const [androidNotice, setAndroidNotice] = useState('');
  const [choice, setChoice] = useState<LabelChoice>('touched');
  const [picked, setPicked] = useState<Record<string, string>>(() => Object.fromEntries(touched.map(id => [id, id])));
  const [selection, setSelection] = useState<{ layer: AnatomyLayer; id: string }>();
  const [projected, setProjected] = useState<{ layer: AnatomyLayer; targets: BoneTarget[] }>();
  const [showAll, setShowAll] = useState(false);
  const openedQuickLook = useRef(false);
  const controls = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  useEffect(() => {
    if (!controls.current) return;
    const panel = controls.current;
    const observer = new ResizeObserver(() => {
      setPanelHeight(window.matchMedia('(max-width: 760px)').matches ? panel.offsetHeight+12 : 0);
    });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let discarded = false;
    const prepared: LayerModels = {};
    let dispose: ((model: Group) => void) | undefined;
    void (async () => {
      try {
        const { loadPosedSkeleton, loadPosedAnatomyLayer, disposeSkeleton } = await import('./posedSkeleton');
        if (discarded) return;
        dispose = disposeSkeleton;
        const skeleton = await loadPosedSkeleton(pose);
        if (discarded) { disposeSkeleton(skeleton); return; }
        prepared.bones = skeleton;
        setLoaded({ pose, models: { ...prepared } });
        await Promise.all(alternateLayers.map(async id => {
          try {
            const posed = await loadPosedAnatomyLayer(skeleton, id);
            if (discarded) { disposeSkeleton(posed); return; }
            prepared[id] = posed;
            setLoaded({ pose, models: { ...prepared } });
          } catch {
            if (!discarded) setError(layerErrors[id]);
          }
        }));
      } catch {
        if (!discarded) setError('No se pudo preparar la captura. Suelta la pose y vuelve a intentarlo.');
      }
    })();
    return () => {
      discarded = true;
      if (dispose) Object.values(prepared).forEach(dispose);
    };
  }, [pose]);

  const labelKey = (choice === 'main' ? mainAnatomyIds[layer] : choice === 'touched' ? Object.values(picked) : []).join('|');
  const currentExport = appleExport?.model === model && appleExport?.labels === labelKey ? appleExport : undefined;
  const arUrl = currentExport?.url || '';
  const arFailed = currentExport?.url === false;
  useEffect(() => {
    if (!model || !quickLook) return;
    let stopped = false;
    let url = '';
    setAppleExport(undefined);
    void import('./posedSkeleton').then(({ exportSkeleton }) =>
      exportSkeleton(model, labelKey ? labelKey.split('|') : [], layer),
    ).then(blob => {
      if (stopped) return;
      url = URL.createObjectURL(blob);
      setAppleExport({ model, labels: labelKey, url });
    }).catch(() => { if (!stopped) setAppleExport({ model, labels: labelKey, url: false }); });
    return () => {
      stopped = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [model, quickLook, labelKey, layer]);

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

  function openViewer() {
    setSelection(undefined);
    setViewer(true);
  }

  const preparingAR = quickLook && !arFailed && !arUrl;
  const selected = selection?.layer === layer ? selection.id : '';
  const targets = projected?.layer === layer ? projected.targets : [];
  return <>
    {(mode === 'camera' || projection) && model && models.bones && !viewer && cameraHost && createPortal(
      <Suspense fallback={null}>
        <CameraSkeleton model={model} reference={models.bones} layer={layer} framing={framing} selected={selected} projection={projection}
          allowMotion={mode === 'camera'} onReady={onOverlayReady}
          onPick={(id, _x, _y, node) => { setSelection({ layer, id }); remember(id, node); }}
          onProject={next => setProjected({ layer, targets: next })}/>
        <BoneLabels layer={layer} targets={targets} selected={selected} showAll={showAll} reservedBottom={panelHeight}
          reservedTop={mode === 'camera' ? 64 : 48} detailRequest={layer !== 'bones' && selected ? selection : undefined}/>
      </Suspense>, cameraHost,
    )}
    {viewer && model && models.bones && (
      <section className="anatomy-fixed-stage" aria-label={layer === 'bones' ? 'Visor del esqueleto 3D' : `Visor de ${viewerNames[layer]}`}
        data-layer={layer} data-bones={layer === 'bones' ? model.children.length : undefined}>
        <div className="anatomy-viewer-header">
          <h2>{viewerNames[layer]}</h2>
          <Button variant="text" aria-label="Cerrar visor 3D" onClick={() => setViewer(false)}><X size={18} aria-hidden="true"/></Button>
        </div>
        <Suspense fallback={<p className="anatomy-viewer-note" role="status">Abriendo visor…</p>}>
          <SkeletonViewer model={model} reference={models.bones} layer={layer} reservedBottom={panelHeight} onPicked={remember}/>
        </Suspense>
      </section>
    )}
    <div className="anatomy-controls anatomy-fixed-controls" ref={controls}>
      <FixedLayerButtons layer={layer} available={available} onChange={onLayerChange}/>
      {model && (mode === 'camera' || projection) && <div className="anatomy-ios-options">
        {quickLook && <label>Etiquetas para el visor de Apple
          <select value={choice} onChange={event => setChoice(event.target.value as LabelChoice)}>
            <option value="none">Sin etiquetas</option>
            <option value="touched">Piezas que toqué</option>
            <option value="main">Etiquetas principales</option>
          </select>
        </label>}
        {!viewer && <Button variant="secondary" aria-pressed={showAll} onClick={() => setShowAll(value => !value)}>Etiquetas</Button>}
        {mode === 'camera' && !cameraHost && <Button variant="secondary" onClick={() => { void startCamera(); }}>Reactivar cámara</Button>}
      </div>}
      <div className="anatomy-fixed-actions">
        {mode === 'webxr' && model ? (
          <Suspense fallback={<Button disabled>Preparando AR…</Button>}>
            <AndroidSpace model={model} layer={layer} available={available} onLayerChange={onLayerChange}
              onPicked={remember} beforeEnter={stopCamera} onExit={() => { void startCamera(); }}
              onFallback={message => { setAndroidNotice(message); openViewer(); }}/>
          </Suspense>
        ) : arUrl ? (
          <a className="button button--primary" rel="ar" href={arUrl + '#allowsContentScaling=0'}
            download={quickLookFiles[layer]} aria-label="Ver en mi espacio" onClick={() => { openedQuickLook.current = true; }}>
            <img src={arImage} alt=""/>
          </a>
        ) : (
          <Button disabled={!model || preparingAR} onClick={() => {
            if (android) setAndroidNotice(noXR);
            openViewer();
          }}><ScanLine size={17} aria-hidden="true"/> {model && preparingAR ? 'Preparando AR…' : 'Ver en mi espacio'}</Button>
        )}
        <Button variant="secondary" disabled={!model} onClick={openViewer}>
          <Box size={17} aria-hidden="true"/> Ver en 3D
        </Button>
        <Button variant="text" onClick={onRelease}>Soltar</Button>
      </div>
      {mode === 'camera' && <p className="anatomy-note">Al caminar, la captura pierde su posición sobre la cámara. {quickLook && 'En iPhone, «Ver en mi espacio» abre el visor AR de Apple.'}</p>}
      {androidNotice && <p className="anatomy-note" role="status">{androidNotice}</p>}
      {arFailed && <p className="anatomy-note" role="status">AR no está disponible para esta captura. Puedes verla en 3D.</p>}
      {error && <p className="anatomy-error" role="alert">{error}</p>}
      {!model && !error && <p className="anatomy-note">Preparando captura…</p>}
    </div>
  </>;
}
