import { lazy, Suspense, useEffect, useState } from 'react';
import { Box, ScanLine, X } from 'lucide-react';
import type { Group } from 'three';
import { Button } from '../../shared/ui/Button';
import type { BodyPoint } from './anatomy';

const AndroidSpace = lazy(() => import('./AndroidSpace').then(module => ({ default: module.AndroidSpace })));
const SkeletonViewer = lazy(() => import('./SkeletonViewer'));
const arImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function supportsQuickLook() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && document.createElement('a').relList.supports?.('ar') === true;
}

export default function FixedSkeleton({ pose, onRelease, stopCamera, startCamera }: {
  pose: BodyPoint[]; onRelease: () => void; stopCamera: () => void; startCamera: () => Promise<void>;
}) {
  const [quickLook] = useState(supportsQuickLook);
  const [model, setModel] = useState<Group>();
  const [arUrl, setArUrl] = useState('');
  const [error, setError] = useState('');
  const [arFailed, setArFailed] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [androidNotice, setAndroidNotice] = useState('');
  const android = /Android/i.test(navigator.userAgent);

  useEffect(() => {
    let disposed = false;
    let skeleton: Group | undefined;
    let dispose: ((model: Group) => void) | undefined;
    let url: string | undefined;
    void (async () => {
      try {
        const { loadPosedSkeleton, disposeSkeleton, exportSkeleton } = await import('./posedSkeleton');
        if (disposed) return;
        dispose = disposeSkeleton;
        skeleton = await loadPosedSkeleton(pose);
        if (disposed) { dispose(skeleton); return; }
        setModel(skeleton);
        if (quickLook) {
          try {
            const blob = await exportSkeleton(skeleton);
            if (disposed) return;
            url = URL.createObjectURL(blob);
            setArUrl(url);
          } catch {
            if (!disposed) setArFailed(true);
          }
        }
      } catch {
        if (!disposed) setError('No se pudo armar el esqueleto. Suelta la pose y vuelve a intentarlo.');
      }
    })();
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
      if (skeleton) dispose?.(skeleton);
    };
  }, [pose, quickLook]);

  const preparingAR = quickLook && !arFailed && !arUrl;
  return <>
    {viewer && model && (
      <section className="anatomy-fixed-stage" aria-label="Visor del esqueleto 3D" data-bones={model.children.length}>
        <div className="anatomy-viewer-header">
          <h2>Esqueleto 3D</h2>
          <Button variant="text" aria-label="Cerrar visor 3D" onClick={() => setViewer(false)}><X size={18} aria-hidden="true"/></Button>
        </div>
        <Suspense fallback={<p className="anatomy-viewer-note" role="status">Abriendo visor…</p>}>
          <SkeletonViewer model={model}/>
        </Suspense>
      </section>
    )}
    <div className="anatomy-controls anatomy-fixed-controls">
      <div className="anatomy-fixed-actions">
        {android && model ? (
          <Suspense fallback={<Button disabled>Preparando AR…</Button>}>
            <AndroidSpace model={model} beforeEnter={stopCamera} onExit={() => { void startCamera(); }}
              onFallback={message => { setAndroidNotice(message); setViewer(true); }}/>
          </Suspense>
        ) : arUrl ? (
          <a className="button button--primary" rel="ar" href={arUrl + '#allowsContentScaling=0'}
            download="esqueleto.usdz" aria-label="Ver en mi espacio">
            <img src={arImage} alt=""/>
          </a>
        ) : (
          <Button disabled={!model || preparingAR} onClick={() => {
            setViewer(true);
          }}>
            <ScanLine size={17} aria-hidden="true"/> {model && preparingAR ? 'Preparando AR…' : 'Ver en mi espacio'}
          </Button>
        )}
        <Button variant="secondary" disabled={!model} onClick={() => setViewer(true)}>
          <Box size={17} aria-hidden="true"/> Ver en 3D
        </Button>
        <Button variant="text" onClick={onRelease}>Soltar</Button>
      </div>
      {androidNotice && <p className="anatomy-note" role="status">{androidNotice}</p>}
      {arFailed && <p className="anatomy-note" role="status">AR no está disponible para esta captura. Puedes verla en 3D.</p>}
      {error && <p className="anatomy-error" role="alert">{error}</p>}
      {!model && !error && <p className="anatomy-note">Preparando esqueleto…</p>}
    </div>
  </>;
}
