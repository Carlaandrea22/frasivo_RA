import { useEffect, useRef, useState } from 'react';
import { RotateCcw, RotateCw, Scan, ZoomIn } from 'lucide-react';
import { AmbientLight, DirectionalLight, Group, HemisphereLight, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SoftwareTermId } from './catalog';
import { createSoftwareScene, disposeSoftwareScene } from './scenes';

interface ViewerApi { select: (id: SoftwareTermId) => void; rotate: (angle: number) => void; resize: (size: number) => void; reset: () => void }
export function ObjectViewer({ termId }: { termId: SoftwareTermId }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const api = useRef<ViewerApi | null>(null);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const host = hostRef.current!;
    let renderer: WebGLRenderer;
    try { renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { setError('El visor 3D no está disponible en este navegador. Puedes seguir leyendo y escuchando las palabras. Prueba un navegador con WebGL habilitado.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-label', 'Modelo 3D interactivo. Arrastra para girar o usa los botones de giro.');
    renderer.domElement.setAttribute('role', 'img');
    host.append(renderer.domElement);
    const scene = new Scene();
    scene.add(new AmbientLight(0xffffff, 1.2), new HemisphereLight(0xffffff, 0x577367, 2));
    const key = new DirectionalLight(0xffffff, 3); key.position.set(3, 5, 4); scene.add(key);
    const camera = new PerspectiveCamera(36, 1, .1, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = false;
    controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI - .15;
    const carrier = new Group(); scene.add(carrier);
    let model: Group | undefined;
    let frame = 0, disposed = false, lost = false;
    const render = () => {
      frame = 0;
      if (disposed || lost || document.hidden) return;
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      host.dataset.rendered = model?.name ?? '';
    };
    const request = () => { if (!frame && !disposed && !lost) frame = requestAnimationFrame(render); };
    const reset = () => {
      carrier.scale.setScalar(1); carrier.rotation.set(0, 0, 0);
      camera.position.set(3.5, 2.5, 6.2); controls.target.set(0, 0, 0); controls.update(); request();
    };
    api.current = {
      select: id => {
        delete host.dataset.rendered;
        if (model) { carrier.remove(model); disposeSoftwareScene(model); }
        model = createSoftwareScene(id); carrier.add(model); reset();
      },
      rotate: angle => { carrier.rotation.y += angle; request(); },
      resize: size => { carrier.scale.setScalar(size); request(); }, reset,
    };
    const contextLost = (event: Event) => {
      event.preventDefault(); lost = true;
      delete host.dataset.rendered;
      setError('El visor 3D no está disponible porque se interrumpió la conexión gráfica. Recarga la página para volver a intentarlo.');
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    controls.addEventListener('change', request);
    const observer = new ResizeObserver(request); observer.observe(host);
    document.addEventListener('visibilitychange', request);
    reset();
    return () => {
      disposed = true; api.current = null; cancelAnimationFrame(frame);
      observer.disconnect(); document.removeEventListener('visibilitychange', request);
      controls.removeEventListener('change', request); controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      if (model) disposeSoftwareScene(model);
      scene.clear(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      delete host.dataset.rendered;
    };
  }, []);
  useEffect(() => { api.current?.select(termId); setScale(1); }, [termId]);
  return <>
    <div ref={hostRef} className="object-canvas" hidden={!!error}/>
    {error ? <p className="object-webgl-error" role="status">{error}</p> : null}
    <div className="object-transform" aria-label="Controles del modelo 3D">
      <div className="object-rotation">
        <button disabled={!!error} aria-label="Girar a la izquierda" onClick={() => api.current?.rotate(-Math.PI / 8)}><RotateCcw size={17}/></button>
        <button disabled={!!error} aria-label="Girar a la derecha" onClick={() => api.current?.rotate(Math.PI / 8)}><RotateCw size={17}/></button>
        <button disabled={!!error} aria-label="Restablecer vista" onClick={() => { api.current?.reset(); setScale(1); }}><Scan size={17}/></button>
      </div>
      <label className="object-size"><ZoomIn size={16}/><span>Tamaño</span><input disabled={!!error} aria-label="Tamaño del objeto" type="range" min="0.65" max="1.5" step="0.05" value={scale} onChange={e => { const size = Number(e.target.value); setScale(size); api.current?.resize(size); }}/></label>
    </div>
  </>;
}
