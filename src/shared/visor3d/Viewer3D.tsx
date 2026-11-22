import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '../ui/Button';
import { mountViewport, type ViewerStatus, type ViewportOptions } from './viewport';
import './viewer3d.css';

export type { Viewer3DAnchor, Viewer3DProjectedAnchor } from './modelScene';

export interface Viewer3DProps extends ViewportOptions {
  src: string;
  nodeId?: string;
  label?: string;
  children?: ReactNode;
  fallback?: ReactNode;
}

const messages: Record<Exclude<ViewerStatus, 'ready'>, string> = {
  loading: 'Cargando modelo 3D…',
  error: 'No se pudo cargar el modelo 3D.',
  webgl: 'El visor 3D necesita WebGL en este dispositivo.',
};

export function Viewer3D(props: Viewer3DProps) {
  const { src, nodeId, label = 'Visor 3D', anchors, onProject, selectedNodeId, children, fallback } = props;
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<ReturnType<typeof mountViewport>>(undefined);
  const current = useRef(props);
  const description = useId();
  const [status, setStatus] = useState<ViewerStatus>('loading');
  const projects = Boolean(onProject);

  useEffect(() => { current.current = props; }, [props]);

  useEffect(() => {
    if (!host.current) return;
    setStatus('loading');
    runtime.current = mountViewport(host.current, src, nodeId, description, () => current.current, setStatus);
    if (!runtime.current) current.current.onProject?.([]);
    return () => {
      runtime.current?.dispose();
      runtime.current = undefined;
    };
  }, [src, nodeId, description]);

  useEffect(() => { runtime.current?.sync(); }, [anchors, projects, selectedNodeId]);

  const ready = status === 'ready';
  return (
    <section className="viewer3d" aria-label={label} data-viewer-state={status}>
      <span className="viewer3d__description" id={description}>
        Arrastra o usa las flechas para girar. Pellizca con dos dedos o usa los botones para cambiar el zoom.
      </span>
      <div ref={host} className="viewer3d__stage">
        {ready && children && <div className="viewer3d__overlay">{children}</div>}
        {!ready && (status !== 'loading' && fallback
          ? <div className="viewer3d__message">{fallback}<p role="status">{messages[status]}</p></div>
          : <p className="viewer3d__message" role={status === 'loading' ? 'status' : 'alert'}>{messages[status]}</p>)}
      </div>
      <div className="viewer3d__controls" role="group" aria-label="Controles del visor 3D">
        <Button variant="secondary" aria-label="Acercar" disabled={!ready} onClick={() => runtime.current?.zoomIn()}>
          <Plus size={20} aria-hidden="true" />
        </Button>
        <Button variant="secondary" aria-label="Alejar" disabled={!ready} onClick={() => runtime.current?.zoomOut()}>
          <Minus size={20} aria-hidden="true" />
        </Button>
        <Button variant="secondary" disabled={!ready} onClick={() => runtime.current?.reset()}>
          <RotateCcw size={17} aria-hidden="true" />
          Restablecer vista
        </Button>
      </div>
    </section>
  );
}

export default Viewer3D;
