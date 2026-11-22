import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, ScanLine, Tags, X } from 'lucide-react';
import {
  Color, DirectionalLight, DoubleSide, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PerspectiveCamera, Quaternion, Raycaster, RingGeometry, Scene,
  Vector2, Vector3, WebGLRenderer,
} from 'three';
import { Button } from '../../shared/ui/Button';
import { BoneLabels, type BoneTarget } from './BoneLabels';
import { projectBones } from './boneProjection';
import { facingYaw, floorHit, requestAndroidAR, requestPlacementAnchor } from './androidXR';
import './android-space.css';

const unavailable = 'La realidad aumentada requiere Chrome y Servicios de Google Play para RA (ARCore) en un Android compatible. Puedes ver el esqueleto en 3D.';
const failedSession = 'No se pudo abrir la realidad aumentada. Comprueba el permiso de cámara y que ARCore esté actualizado. Puedes ver el esqueleto en 3D.';
const placementHint = 'Apunta al piso donde estaba la persona y toca para colocar.';
const positionHint = 'El esqueleto puede moverse un poco mientras usas la cámara.';
type Mode = 'starting' | 'scanning' | 'anchoring' | 'placed';
type Props = {
  model: Group;
  beforeEnter: () => void;
  onExit: () => void;
  onFallback: (message: string) => void;
};
type SceneUpdates = {
  mode: (mode: Mode) => void;
  message: (message: string) => void;
  select: (id: string | undefined) => void;
  targets: (targets: BoneTarget[]) => void;
  showAll: () => boolean;
  onError: () => void;
};

function deleteAnchor(anchor: XRAnchor | undefined) {
  // A user agent can release its anchors when it ends the session.
  try { anchor?.delete(); } catch {}
}

function createScene(session: XRSession, overlay: HTMLElement, model: Group, updates: SceneUpdates) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, .02, 30);
  const canvas = document.createElement('canvas');
  const attributes: WebGLContextAttributes & { xrCompatible: boolean } = {
    alpha: true, antialias: true, xrCompatible: true,
  };
  const context = canvas.getContext('webgl2', attributes);
  if (!context) throw new Error('WebGL 2 no está disponible.');
  const renderer = new WebGLRenderer({ ...attributes, canvas, context });
  renderer.setClearColor(0, 0);
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local');
  canvas.hidden = true;
  overlay.appendChild(canvas);

  const fill = new HemisphereLight(0xfff8ee, 0xaeb9cc, 1.8);
  const key = new DirectionalLight(0xfff3e3, 2.1);
  key.position.set(.6, 3, 2);
  scene.add(fill, key);

  const root = new Group();
  const bones = model.clone(true);
  root.add(bones);
  root.visible = false;
  scene.add(root);
  const baseMaterials = new Map<Mesh, { material: MeshStandardMaterial; color: Color; intensity: number }[]>();
  bones.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const clones = (Array.isArray(object.material) ? object.material : [object.material])
      .map(material => material instanceof MeshStandardMaterial ? material.clone() : material);
    object.material = Array.isArray(object.material) ? clones : clones[0];
    baseMaterials.set(object, clones.filter(material => material instanceof MeshStandardMaterial).map(material => ({
      material, color: material.emissive.clone(), intensity: material.emissiveIntensity,
    })));
  });
  const accent = new Color(getComputedStyle(overlay).getPropertyValue('--anatomy-highlight').trim() || '#fff3b0');
  const reticleGeometry = new RingGeometry(.075, .09, 42).rotateX(-Math.PI / 2);
  const reticleMaterial = new MeshBasicMaterial({ color: accent, side: DoubleSide });
  const reticle = new Mesh(reticleGeometry, reticleMaterial);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const ray = new Raycaster();
  const ndc = new Vector2();
  const probe = new Vector3();
  const viewAtStart = new Vector3();
  const front = new Vector3();
  const up = new Vector3(0, 1, 0);
  const anchorToModel = new Quaternion();
  let initialYaw = 0;
  let hasViewer = false;
  let preferred: Mesh | undefined;
  let hitTest: XRHitTestSource | undefined;
  let floorSpace: XRReferenceSpace | undefined;
  let anchor: XRAnchor | undefined;
  let state: Mode = 'starting';
  let requestedPlacement = false;
  let disposed = false;
  let lastProjection = -Infinity;

  function setMode(mode: Mode) {
    state = mode;
    updates.mode(mode);
  }

  function setHighlight(mesh: Mesh | undefined) {
    for (const entry of (preferred ? baseMaterials.get(preferred) : undefined) ?? []) {
      entry.material.emissive.copy(entry.color);
      entry.material.emissiveIntensity = entry.intensity;
    }
    preferred = mesh;
    for (const { material } of (preferred ? baseMaterials.get(preferred) : undefined) ?? []) {
      material.emissive.copy(accent);
      material.emissiveIntensity = .48;
    }
    lastProjection = -Infinity;
    updates.select(preferred?.userData.term);
  }

  function rayHit() {
    return ray.intersectObject(bones, true).find(({ object }) => object.userData.term);
  }

  function select(event: XRInputSourceEvent) {
    if (state === 'scanning' && reticle.visible) {
      requestedPlacement = true;
      return;
    }
    const space = renderer.xr.getReferenceSpace();
    if (state !== 'placed' || !root.visible || !space) return;
    const pose = event.frame.getPose(event.inputSource.targetRaySpace, space);
    if (!pose) return;
    const { position, orientation } = pose.transform;
    ray.ray.origin.set(position.x, position.y, position.z);
    ray.ray.direction.set(0, 0, -1).applyQuaternion(new Quaternion(
      orientation.x, orientation.y, orientation.z, orientation.w,
    ));
    let hit = rayHit();
    const view = renderer.xr.getCamera().cameras[0];
    if (!hit && view && event.inputSource.targetRayMode === 'screen') {
      // Search around the exact ray to give narrow meshes a usable touch area.
      probe.copy(ray.ray.origin).add(ray.ray.direction).project(view);
      const width = Math.max(overlay.clientWidth, 1), height = Math.max(overlay.clientHeight, 1);
      for (const distance of [11, 22]) {
        for (let index = 0; index < 8 && !hit; index++) {
          const angle = index * Math.PI / 4;
          ndc.set(probe.x + 2 * distance * Math.cos(angle) / width, probe.y + 2 * distance * Math.sin(angle) / height);
          ray.setFromCamera(ndc, view);
          hit = rayHit();
        }
        if (hit) break;
      }
    }
    setHighlight(hit?.object as Mesh | undefined);
  }

  function overlaySelect(event: Event) {
    if (event.target instanceof Element
      && event.target.closest('button, a, input, textarea, select, dialog, [role="dialog"], .bone-label-card')) event.preventDefault();
  }

  function place(frame: XRFrame, hit: XRHitTestResult, pose: XRPose, space: XRReferenceSpace) {
    const { position, orientation } = pose.transform;
    root.position.set(position.x, position.y, position.z);
    root.quaternion.setFromAxisAngle(up, facingYaw(root.position, viewAtStart, initialYaw));
    const hitRotation = new Quaternion(orientation.x, orientation.y, orientation.z, orientation.w);
    anchorToModel.copy(hitRotation).invert().multiply(root.quaternion);
    const request = requestPlacementAnchor(session, frame, hit, pose.transform, space);

    function finishPlacement(next?: XRAnchor) {
      if (disposed) { deleteAnchor(next); return; }
      anchor = next;
      updates.message(next ? '' : positionHint);
      setMode('placed');
    }

    if (request) {
      setMode('anchoring');
      void request.then(finishPlacement);
    } else {
      finishPlacement();
    }
  }

  function draw(time: number, frame?: XRFrame) {
    const space = renderer.xr.getReferenceSpace();
    if (!frame || !space || disposed) return;
    try {
      const viewer = frame.getViewerPose(space);
      if (viewer && !hasViewer) {
        const { position, orientation } = viewer.transform;
        viewAtStart.set(position.x, position.y, position.z);
        front.set(0, 0, 1).applyQuaternion(new Quaternion(
          orientation.x, orientation.y, orientation.z, orientation.w,
        ));
        initialYaw = Math.atan2(front.x, front.z);
        hasViewer = true;
      }

      reticle.visible = false;
      if (state === 'scanning' && hitTest && viewer) {
        for (const hit of frame.getHitTestResults(hitTest)) {
          const pose = hit.getPose(space);
          const floorY = floorSpace ? hit.getPose(floorSpace)?.transform.position.y : undefined;
          if (!pose || !floorHit(pose.transform.matrix, pose.transform.position.y, viewAtStart.y, floorY)) continue;
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
          reticle.matrixWorldNeedsUpdate = true;
          if (requestedPlacement) {
            reticle.visible = false;
            place(frame, hit, pose, space);
          }
          break;
        }
      }
      requestedPlacement = false;
      const anchorPose = anchor ? frame.getPose(anchor.anchorSpace, space) : undefined;
      root.visible = state === 'placed' && Boolean(viewer && (!anchor || anchorPose));
      if (anchorPose) {
        const { position, orientation } = anchorPose.transform;
        root.position.set(position.x, position.y, position.z);
        root.quaternion.set(orientation.x, orientation.y, orientation.z, orientation.w).multiply(anchorToModel);
      }
      renderer.render(scene, camera);

      // Projection keeps the HTML facing the viewer at a constant readable size.
      if (time - lastProjection >= 1000 / 30) {
        lastProjection = time;
        const view = renderer.xr.getCamera().cameras[0];
        const showAll = updates.showAll();
        const selected = preferred?.userData.term;
        if (root.visible && view && (selected || showAll)) {
          const projected = projectBones(bones, view, preferred);
          updates.targets(showAll ? projected : projected.filter(target => target.id === selected));
        } else {
          updates.targets([]);
        }
      }
    } catch {
      updates.onError();
    }
  }

  canvas.addEventListener('webglcontextlost', updates.onError);
  session.addEventListener('select', select);
  overlay.addEventListener('beforexrselect', overlaySelect);

  return {
    async start() {
      const viewerSpace = await session.requestReferenceSpace('viewer');
      if (disposed) return;
      const pendingHit = session.requestHitTestSource?.({ space: viewerSpace, entityTypes: ['plane'] });
      if (!pendingHit) throw new Error('No se puede detectar el piso.');
      const source = await pendingHit;
      if (disposed) { try { source.cancel(); } catch {} return; }
      hitTest = source;
      floorSpace = await session.requestReferenceSpace('local-floor').catch(() => undefined);
      if (disposed) return;
      await renderer.xr.setSession(session);
      if (disposed) return;
      setMode('scanning');
      renderer.setAnimationLoop(draw);
    },
    move() {
      if (state !== 'placed' || disposed) return;
      deleteAnchor(anchor);
      anchor = undefined;
      root.visible = false;
      setHighlight(undefined);
      updates.targets([]);
      updates.message('');
      setMode('scanning');
    },
    dispose() {
      disposed = true;
      canvas.removeEventListener('webglcontextlost', updates.onError);
      session.removeEventListener('select', select);
      overlay.removeEventListener('beforexrselect', overlaySelect);
      try { hitTest?.cancel(); } catch {}
      deleteAnchor(anchor);
      renderer.setAnimationLoop(null);
      for (const entries of baseMaterials.values()) {
        for (const { material } of entries) material.dispose();
      }
      reticleGeometry.dispose();
      reticleMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

export function AndroidSpace({ model, beforeEnter, onExit, onFallback }: Props) {
  const overlay = useRef<HTMLDivElement>(null);
  const attempt = useRef<{ exit: () => void; cancel: () => void; move: () => void } | null>(null);
  const showAll = useRef(false);
  const [labels, setLabels] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string>();
  const [targets, setTargets] = useState<BoneTarget[]>([]);

  useEffect(() => () => attempt.current?.cancel(), []);

  function enter() {
    if (attempt.current || !overlay.current) return;
    const xr = navigator.xr;
    if (!xr) { onFallback(unavailable); return; }
    const controls = overlay.current;
    let cancelled = false;
    let ending = false;
    let session: XRSession | undefined;
    let scene: ReturnType<typeof createScene> | undefined;
    let fallback = '';

    function finish() {
      if (attempt.current !== active) return;
      attempt.current = null;
      scene?.dispose();
      if (cancelled) return;
      showAll.current = false;
      setLabels(false);
      setMode(null);
      setMessage('');
      setSelected(undefined);
      setTargets([]);
      onExit();
      if (fallback) onFallback(fallback);
    }

    function ended() {
      ending = true;
      session?.removeEventListener('end', ended);
      // The Three.js XR manager also handles 'end' and restores its render target first.
      queueMicrotask(finish);
    }

    function exit() {
      if (ending || !session) return;
      ending = true;
      void session.end().catch(ended);
    }

    const active = { exit, cancel: () => { cancelled = true; exit(); }, move: () => scene?.move() };
    attempt.current = active;
    setMode('starting');
    void (async () => {
      try {
        // Call requestSession directly from the click, before any asynchronous work.
        session = await requestAndroidAR(xr, controls, beforeEnter);
        session.addEventListener('end', ended, { once: true });
        if (cancelled) { exit(); return; }
        scene = createScene(session, controls, model, {
          mode: setMode, message: setMessage, select: setSelected,
          targets(next) { setTargets(previous => next.length || previous.length ? next : previous); },
          showAll: () => showAll.current,
          onError() { fallback = failedSession; exit(); },
        });
        await scene.start();
      } catch (error) {
        fallback = error instanceof DOMException && error.name === 'NotSupportedError'
          ? unavailable : failedSession;
        if (session) exit();
        else finish();
      }
    })();
  }

  const placed = mode === 'placed';
  const guidance = message || (mode === 'scanning' ? placementHint : mode === 'anchoring' ? 'Anclando esqueleto…' : '');
  return <>
    <Button disabled={mode !== null} onClick={enter}>
      <ScanLine size={17} aria-hidden="true"/> {mode === 'starting' ? 'Abriendo AR…' : 'Ver en mi espacio'}
    </Button>
    {createPortal(
      <div ref={overlay} className="anatomy-android-space">
        {mode && <>
          <div className="anatomy-android-space-controls">
            {placed && <>
              <Button variant="secondary" onClick={() => attempt.current?.move()}>
                <Crosshair size={18} aria-hidden="true"/> Mover
              </Button>
              <Button variant={labels ? 'primary' : 'secondary'} aria-pressed={labels} onClick={() => {
                showAll.current = !showAll.current;
                setLabels(showAll.current);
              }}>
                <Tags size={18} aria-hidden="true"/> Etiquetas
              </Button>
            </>}
            <Button variant="secondary" onClick={() => attempt.current?.exit()} disabled={mode === 'starting'}>
              <X size={18} aria-hidden="true"/> Salir
            </Button>
          </div>
          {guidance && <p className="anatomy-android-space-hint" role="status">{guidance}</p>}
          {placed && <BoneLabels targets={targets} selected={selected} showAll={labels}/>}
        </>}
      </div>,
      document.body,
    )}
  </>;
}
