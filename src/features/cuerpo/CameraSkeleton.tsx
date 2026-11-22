import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import {
  Box3, DirectionalLight, Group, HemisphereLight, MathUtils, Mesh, MeshStandardMaterial, Object3D,
  PerspectiveCamera, Quaternion, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { Button } from '../../shared/ui/Button';
import { projectBones } from './boneProjection';
import { deviceRotation, frozenPosition, type CameraFraming } from './cameraFraming';
import { fitPoseProjection } from './poseProjection';
import type { PrecisePose } from './poseCapture';
import './CameraSkeleton.css';

export interface CameraSkeletonPoint {
  id: string;
  x: number;
  y: number;
}

type MotionStatus = 'idle' | 'requesting' | 'waiting' | 'active' | 'unavailable';
type OrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

interface CameraSkeletonProps {
  model: Group;
  framing: CameraFraming;
  selected?: string;
  onPick: (id: string, x: number, y: number, nodeName?: string) => void;
  onProject?: (points: CameraSkeletonPoint[]) => void;
  trackedIds?: readonly string[];
  projection?: PrecisePose | null;
  allowMotion?: boolean;
  onReady?: () => void;
}

export default function CameraSkeleton({ model, framing, selected, onPick, onProject, trackedIds, projection, allowMotion = true, onReady }: CameraSkeletonProps) {
  const host = useRef<HTMLDivElement>(null);
  const draw = useRef<() => void>(undefined);
  const rotation = useRef(new Quaternion());
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [motion, setMotion] = useState<MotionStatus>('idle');
  const [failed, setFailed] = useState(false);
  const currentSelection = useEffectEvent(() => selected);
  const publish = useEffectEvent((points: CameraSkeletonPoint[]) => {
    onProject?.(trackedIds ? points.filter(point => trackedIds.includes(point.id)) : points);
  });
  const pick = useEffectEvent(onPick);
  const ready = useEffectEvent(() => onReady?.());
  const { x, y, height } = framing;
  const trackedKey = trackedIds?.join('|');

  useEffect(() => {
    const root = host.current;
    if (!root) return;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    const canvas = renderer.domElement;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearAlpha(0);
    canvas.setAttribute('aria-label', 'Esqueleto 3D sobre la cámara');
    root.appendChild(canvas);

    const skeleton = model.clone();
    const bounds = new Box3().setFromObject(skeleton, true);
    const size = bounds.getSize(new Vector3());
    const pivot = new Group();
    const center = bounds.getCenter(new Vector3());
    skeleton.position.sub(center);
    pivot.add(skeleton);
    const camera = new PerspectiveCamera(42, 1, .025, 80);
    const scene = new Scene();
    const key = new DirectionalLight(0xfff3e3, 2);
    key.position.set(1, 3, 4);
    scene.add(pivot, key, new HemisphereLight(0xfff5e6, 0xafc4be, 1.75));

    const ray = new Raycaster();
    const pointers = new Map<number, Vector2>();
    const materials = new Map<MeshStandardMaterial, MeshStandardMaterial>();
    let tap: { position: Vector2; id: number } | undefined;
    let picked: Object3D | undefined;
    let highlighted: { mesh: Mesh; material: MeshStandardMaterial } | undefined;
    let targets: CameraSkeletonPoint[] = [];
    let zoom = 1, frame = 0, width = 0, viewHeight = 0;
    let contextLost = false, reported = false, measureProjection = false;
    let calibration: ReturnType<typeof fitPoseProjection> = null;

    function updateHighlight(object?: Object3D) {
      if (highlighted?.mesh === object) return;
      if (highlighted) highlighted.mesh.material = highlighted.material;
      highlighted = undefined;
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      const material = object.material;
      let highlight = materials.get(material);
      if (!highlight) {
        highlight = material.clone();
        highlight.emissive.set(getComputedStyle(root!).getPropertyValue('--anatomy-highlight').trim() || '#ffda63');
        highlight.emissiveIntensity = .6;
        materials.set(material, highlight);
      }
      highlighted = { mesh: object, material };
      object.material = highlight;
    }

    function render() {
      frame = 0;
      if (!width || !viewHeight || contextLost) return;
      if (calibration) {
        const { fit } = calibration;
        camera.position.fromArray(fit.position).sub(center);
        camera.quaternion.fromArray(fit.quaternion).multiply(rotation.current);
        camera.fov = fit.fov;
        camera.zoom = zoom;
        camera.updateProjectionMatrix();
      } else {
        camera.quaternion.copy(rotation.current);
        pivot.position.copy(frozenPosition({ x, y, height }, size, camera, zoom));
      }
      const id = currentSelection();
      const preferred = id
        ? picked?.userData.term === id ? picked : skeleton.getObjectByProperty('name', id)
          ?? skeleton.children.find(object => object.userData.term === id)
        : undefined;
      updateHighlight(preferred);
      renderer.render(scene, camera);
      if (calibration && measureProjection) {
        const projected = new Vector3();
        const maximum = Math.max(...calibration.points.map(point => {
          projected.fromArray(point.position).sub(center).project(camera);
          return Math.hypot(((projected.x+1)/2-point.x)*width, ((1-projected.y)/2-point.y)*viewHeight);
        }));
        root!.dataset.calibrationMaxPx = maximum.toFixed(2);
        root!.dataset.calibrationPoints = String(calibration.points.length);
        measureProjection = false;
      }
      targets = projectBones(skeleton, camera, preferred);
      publish(targets);
      if (!reported) {
        reported = true;
        ready();
      }
    }

    function invalidate() {
      if (!frame && !contextLost) frame = requestAnimationFrame(render);
    }

    function resize() {
      if (!root) return;
      width = root.clientWidth;
      viewHeight = root.clientHeight;
      if (!width || !viewHeight) return;
      calibration = projection ? fitPoseProjection(model, projection, width, viewHeight) : null;
      measureProjection = Boolean(calibration);
      camera.aspect = width / viewHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, viewHeight, false);
      invalidate();
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || pointers.size >= 2) return;
      const position = new Vector2(event.clientX, event.clientY);
      pointers.set(event.pointerId, position);
      tap = pointers.size === 1 ? { position, id: event.pointerId } : undefined;
      canvas.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const position = new Vector2(event.clientX, event.clientY);
      pointers.set(event.pointerId, position);
      if (tap) {
        if (tap.position.distanceTo(position) <= 7) return;
        tap = undefined;
      }
      if (pointers.size === 2) {
        const other = [...pointers].find(([id]) => id !== event.pointerId)![1];
        const distance = previous.distanceTo(other);
        if (distance > 4) zoom = MathUtils.clamp(zoom * position.distanceTo(other) / distance, .5, 3);
      } else {
        pivot.rotation.y += (position.x - previous.x) * .012;
        pivot.rotation.x = MathUtils.clamp(pivot.rotation.x + (position.y - previous.y) * .009, -Math.PI * .45, Math.PI * .45);
      }
      invalidate();
    }

    function onPointerEnd(event: PointerEvent) {
      pointers.delete(event.pointerId);
      if (tap?.id !== event.pointerId) return;
      tap = undefined;
      if (event.type !== 'pointerup' || !width || !viewHeight) return;

      const box = canvas.getBoundingClientRect();
      const point = new Vector2((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
      ray.setFromCamera(new Vector2(2 * point.x - 1, 1 - 2 * point.y), camera);
      picked = ray.intersectObject(skeleton, true).find(hit => typeof hit.object.userData.term === 'string')?.object;
      const id = picked?.userData.term as string | undefined;
      const destination = id ? projectBones(skeleton, camera, picked).find(target => target.id === id)
        : targets.reduce<{ target?: CameraSkeletonPoint; distance: number }>((nearest, target) => {
          const distance = Math.hypot((target.x - point.x) * box.width, (target.y - point.y) * box.height);
          return distance < nearest.distance ? { target, distance } : nearest;
        }, { distance: 22 }).target;
      pick(id ?? destination?.id ?? '', destination?.x ?? point.x, destination?.y ?? point.y, picked?.name);
      invalidate();
    }

    function onContextLost(event: Event) {
      event.preventDefault();
      contextLost = true;
      setFailed(true);
      publish([]);
    }

    function onContextRestored() {
      contextLost = false;
      setFailed(false);
      invalidate();
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerEnd);
    canvas.addEventListener('pointercancel', onPointerEnd);
    canvas.addEventListener('lostpointercapture', onPointerEnd);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    draw.current = invalidate;
    resize();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      draw.current = undefined;
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerEnd);
      canvas.removeEventListener('pointercancel', onPointerEnd);
      canvas.removeEventListener('lostpointercapture', onPointerEnd);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      for (const material of materials.values()) material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [model, projection, x, y, height]);

  useEffect(() => {
    draw.current?.();
  }, [selected, trackedKey]);

  useEffect(() => {
    if (!motionEnabled) {
      rotation.current.identity();
      draw.current?.();
      return;
    }
    let calibration: Quaternion | undefined;
    const waiting = window.setTimeout(() => setMotion('unavailable'), 2500);
    function orient(event: DeviceOrientationEvent) {
      const { alpha, beta, gamma } = event;
      if (alpha === null || beta === null || gamma === null) return;
      const angle = screen.orientation?.angle ?? window.orientation ?? 0;
      const next = deviceRotation(alpha, beta, gamma, angle);
      if (!calibration) {
        calibration = next.clone().invert();
        window.clearTimeout(waiting);
        setMotion('active');
      }
      rotation.current.multiplyQuaternions(calibration, next);
      draw.current?.();
    }
    window.addEventListener('deviceorientation', orient, { passive: true });
    return () => {
      window.clearTimeout(waiting);
      window.removeEventListener('deviceorientation', orient);
    };
  }, [motionEnabled]);

  async function toggleMotion() {
    if (motionEnabled) {
      setMotionEnabled(false);
      setMotion('idle');
      return;
    }
    const Orientation = window.DeviceOrientationEvent as OrientationConstructor | undefined;
    if (!Orientation) {
      setMotion('unavailable');
      return;
    }
    setMotion('requesting');
    try {
      if (Orientation.requestPermission && await Orientation.requestPermission() !== 'granted') {
        setMotion('unavailable');
        return;
      }
      setMotion('waiting');
      setMotionEnabled(true);
    } catch {
      setMotion('unavailable');
    }
  }

  return <>
    <div className="anatomy-camera-skeleton" ref={host}/>
    <div className="anatomy-camera-motion">
      {allowMotion && !failed && <Button variant="secondary" aria-pressed={motionEnabled} disabled={motion === 'requesting'}
        onClick={() => { void toggleMotion(); }}>
        <Smartphone size={16} aria-hidden="true"/>
        {motionEnabled ? 'Desactivar giro' : 'Activar giro'}
      </Button>}
      {failed && <p role="alert">El modelo sobre la cámara necesita WebGL.</p>}
      {motion === 'waiting' && <p role="status">Buscando el sensor de giro…</p>}
      {motion === 'unavailable' && <p role="status">Puedes girar el esqueleto con un dedo.</p>}
    </div>
  </>;
}
