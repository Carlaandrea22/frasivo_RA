import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DirectionalLight, Group, HemisphereLight, Matrix4, Mesh, MeshStandardMaterial,
  OrthographicCamera, Quaternion, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import handModel from '../../../assets/anatomy/regions/hand.glb?url';
import headModel from '../../../assets/anatomy/regions/head.glb?url';
import footModel from '../../../assets/anatomy/regions/foot.glb?url';
import rest from '../../../assets/anatomy/regions/anchors.json';
import type { BodyPoint } from './anatomy';
import type { BoneTarget } from './boneLabelPlacement';
import { projectBones } from './boneProjection';
import type { FaceRegion, HandRegion } from './regionalDetection';
import {
  faceRotation, fitHeadProjection, fitLandmarkPlane, fitRegionalSegment, videoPoint,
  type RegionalFoot, type RegionalNeck,
} from './regionalTransforms';
import './regionalBones.css';

interface Props {
  hands: readonly HandRegion[];
  face: FaceRegion | null;
  feet: readonly RegionalFoot[];
  neck?: RegionalNeck | null;
  aspect: number;
  selected?: string;
  opacity?: number;
  onSelect: (id: string) => void;
  onTargets: (targets: BoneTarget[]) => void;
  onFrame?: (now: number) => void;
}

type Kind = 'hand' | 'head' | 'foot';
const urls = { hand: handModel, head: headModel, foot: footModel };
const headAnchorIds = [263, 362, 33, 133, 4, 152];
const headSource = ['eyeLeft', 'eyeRight', 'nose', 'chin'].map(id =>
  new Vector3().fromArray(rest.head[id as keyof typeof rest.head]));
const jawPivot = new Vector3().fromArray(rest.head.jawPivot);
const neckJoint = new Vector3().fromArray(rest.head.neckJoint);
const headWeights = [1.5, 1.5, .6, 1];
const handSource = {
  base: new Vector3().fromArray(rest.hand.palm.wrist),
  middle: new Vector3().fromArray(rest.hand.palm.index),
  tip: new Vector3().fromArray(rest.hand.palm.pinky),
};
const handNormal = handSource.middle.clone().sub(handSource.base)
  .cross(handSource.tip.clone().sub(handSource.base)).normalize();
const footSource = {
  base: new Vector3().fromArray(rest.foot.heel),
  middle: new Vector3().fromArray(rest.foot.toe),
  tip: new Vector3().fromArray(rest.foot.ankle),
};
const handRig = new Map(Object.entries(rest.hand.bones).map(([name, bone]) =>
  [name, { indices: bone.indices, start: new Vector3().fromArray(bone.start), end: new Vector3().fromArray(bone.end) }],
));

interface Part {
  mesh: Mesh;
  restMatrix: Matrix4;
  material: MeshStandardMaterial;
}

interface Instance {
  group: Group;
  parts: Part[];
  points: Vector3[];
  centerX: number;
  rotation?: Quaternion;
  jaw?: number;
}

function termId(name: string) {
  if (name === 'metacarpal_thumb') return 'thumb';
  if (name.startsWith('metacarpal_')) return 'metacarpals';
  if (name.startsWith('metatarsal_')) return 'metatarsals';
  return name;
}

function makeInstance(model: Group, material: MeshStandardMaterial) {
  const group = new Group();
  const parts: Part[] = [];
  model.updateWorldMatrix(true, true);
  model.traverse(node => {
    if (!(node instanceof Mesh)) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    const mesh = node.clone(false);
    mesh.userData.term = termId(node.name);
    mesh.material = material;
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    parts.push({ mesh, restMatrix: node.matrixWorld.clone(), material });
  });
  return { group, parts, points: [], centerX: .5 } satisfies Instance;
}

function disposeModel(model: Group) {
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<MeshStandardMaterial>();
  model.traverse(node => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material instanceof MeshStandardMaterial) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

function apply(part: Part, matrix: Matrix4 | null) {
  part.mesh.visible = Boolean(matrix);
  if (matrix) {
    part.mesh.matrix.multiplyMatrices(matrix, part.restMatrix);
    part.mesh.matrixWorldNeedsUpdate = true;
  }
}

function follow(instance: Instance, points: Vector3[], alpha: number) {
  if (instance.points.length !== points.length) instance.points = points;
  else instance.points.forEach((point, index) => point.lerp(points[index], alpha));
  instance.group.visible = true;
  return instance.points;
}

function hide(instance: Instance) {
  instance.group.visible = false;
  instance.points = [];
  instance.rotation = undefined;
  instance.jaw = undefined;
}

function distanceTo(a: Vector3, b: Vector3) {
  return Math.hypot(a.x-b.x, a.y-b.y);
}

function headLandmarks(face: FaceRegion, aspect: number) {
  const pool = headAnchorIds.map(id => face.landmarks[id]);
  if (pool.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const points = pool.map(point => videoPoint(point, aspect, pool[4].z ?? 0));
  const left = points[0].lerp(points[1], .5), right = points[2].lerp(points[3], .5);
  return [left, right, points[4], points[5]];
}

export default function RegionalBones(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  useLayoutEffect(() => { current.current = props; });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = host.current!;
    const parent = element.parentElement!;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setClearAlpha(0);
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-label', 'Huesos de las regiones detectadas');
    element.appendChild(canvas);
    const scene = new Scene();
    const camera = new OrthographicCamera(0, 1, 1, 0, .01, 20);
    camera.position.z = 4;
    scene.add(new HemisphereLight(0xfff5e5, 0x8398b3, 1.55));
    const key = new DirectionalLight(0xffefe0, 2.05);
    key.position.set(-.4, 1.4, 1.8);
    scene.add(key);
    const fill = new DirectionalLight(0xe0efff, .42);
    fill.position.set(.9, .45, 1);
    scene.add(fill);
    const highlight = new MeshStandardMaterial({ color: 0xffd49e, roughness: .68, emissive: 0x9e6d16, emissiveIntensity: .45 });
    const loader = new GLTFLoader();
    const models = new Map<Kind, { model: Group; instances: Instance[] }>();
    const requested = new Set<Kind>();
    const ray = new Raycaster();
    const pixel = new Vector3();
    let width = 0, height = 0, frame = 0, previousTime = 0;
    let disposed = false, lost = false;
    let preferred: Mesh | undefined;
    let targets: BoneTarget[] = [];

    function load(kind: Kind) {
      if (requested.has(kind)) return;
      requested.add(kind);
      void loader.loadAsync(urls[kind]).then(({ scene: model }) => {
        if (disposed) { disposeModel(model); return; }
        let ivory: MeshStandardMaterial | undefined;
        model.traverse(node => {
          if (!ivory && node instanceof Mesh && node.material instanceof MeshStandardMaterial) ivory = node.material;
        });
        if (!ivory) { disposeModel(model); setFailed(true); return; }
        const instances = Array.from({ length: kind === 'head' ? 1 : 2 }, () => makeInstance(model, ivory!));
        for (const instance of instances) {
          instance.group.name = `region-${kind}`;
          scene.add(instance.group);
          hide(instance);
        }
        models.set(kind, { model, instances });
      }).catch(() => { if (!disposed) setFailed(true); });
    }

    function pointOnCanvas(point: Vector3) {
      const x = (point.x-camera.left)/(camera.right-camera.left);
      const y = (camera.top-point.y)/(camera.top-camera.bottom);
      return [x, y] as const;
    }

    function inView(point: Vector3) {
      const [x, y] = pointOnCanvas(point);
      return x >= -.015 && x <= 1.015 && y >= -.015 && y <= 1.015;
    }

    function updateHand(instance: Instance, hand: HandRegion, aspect: number, alpha: number) {
      const raw = hand.landmarks;
      if (raw.length !== 21 || raw.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        hide(instance);
        return 0;
      }
      const latest = raw.map(point => videoPoint(point, aspect, raw[0].z ?? 0));
      const points = follow(instance, latest, alpha);
      const [wrist, index, pinky] = [points[0], points[5], points[17]];
      const mirrored = hand.side === 'left';
      const palm = fitLandmarkPlane(handSource, { base: wrist, middle: index, tip: pinky }, mirrored);
      if (!palm) { hide(instance); return 0; }
      instance.centerX = pointOnCanvas(wrist.clone().lerp(index.clone().lerp(pinky, .5), .5))[0];
      const imageNormal = index.clone().sub(wrist).cross(pinky.clone().sub(wrist)).normalize();
      const world = hand.worldLandmarks;
      if (world.length === 21) {
        const [base, finger, little] = [world[0], world[5], world[17]]
          .map(point => new Vector3(point.x, -point.y, -(point.z ?? 0)));
        const normal = finger.sub(base).cross(little.sub(base)).normalize();
        if (normal.lengthSq() > .5 && normal.dot(imageNormal) > 0) imageNormal.lerp(normal, .2).normalize();
      }
      if (mirrored) imageNormal.negate();
      const sideScale = (wrist.distanceTo(index) + wrist.distanceTo(pinky)) /
        (handSource.base.distanceTo(handSource.middle) + handSource.base.distanceTo(handSource.tip));
      let error = 0;
      for (const part of instance.parts) {
        const bone = handRig.get(part.mesh.name);
        if (!bone) { apply(part, inView(wrist) ? palm : null); continue; }
        const [from, to] = bone.indices;
        if (!inView(points[from]) || !inView(points[to])) { apply(part, null); continue; }
        const middle = from === 0 ? bone.start.clone().applyMatrix4(palm) : points[from];
        const fit = fitRegionalSegment([bone.start, bone.end], [middle, points[to]], handNormal, imageNormal, sideScale, mirrored);
        apply(part, fit);
        if (fit) {
          const projectedEnd = pixel.copy(bone.end).applyMatrix4(fit);
          const pixelScale = height/(camera.top-camera.bottom);
          error = Math.max(error, distanceTo(projectedEnd, latest[to])*pixelScale);
          if (from !== 0) error = Math.max(error, distanceTo(pixel.copy(bone.start).applyMatrix4(fit), latest[from])*pixelScale);
        }
      }
      return error;
    }

    function updateHead(instance: Instance, face: FaceRegion, neck: RegionalNeck | null | undefined, aspect: number, alpha: number) {
      const landmarks = headLandmarks(face, aspect), direction = faceRotation(face.matrix);
      if (!landmarks || !direction) { hide(instance); return 0; }
      const points = follow(instance, landmarks, alpha);
      if (!instance.rotation) instance.rotation = direction;
      else instance.rotation.slerp(direction, alpha);
      instance.jaw = (instance.jaw ?? face.jawOpen) + (face.jawOpen - (instance.jaw ?? face.jawOpen))*alpha;
      const open = new Matrix4().makeTranslation(jawPivot.x, jawPivot.y, jawPivot.z)
        .multiply(new Matrix4().makeRotationX(Math.min(.53, instance.jaw*.58)))
        .multiply(new Matrix4().makeTranslation(-jawPivot.x, -jawPivot.y, -jawPivot.z));
      const anchors = [headSource[0], headSource[1], headSource[2], headSource[3].clone().applyMatrix4(open)];
      const fit = fitHeadProjection(anchors, points, instance.rotation, headWeights);
      if (!fit) { hide(instance); return 0; }
      instance.centerX = pointOnCanvas(points[0].clone().lerp(points[1], .5))[0];
      for (const part of instance.parts) {
        if (part.mesh.name === 'mandible') {
          apply(part, fit.clone().multiply(open));
        } else if (part.mesh.name === 'cervical') {
          if (!neck) { apply(part, null); continue; }
          const center = videoPoint(neck.shoulderLeft, aspect, face.landmarks[4].z ?? 0)
            .lerp(videoPoint(neck.shoulderRight, aspect, face.landmarks[4].z ?? 0), .5);
          const top = neckJoint.clone().applyMatrix4(fit);
          const bounds = part.mesh.geometry.boundingBox!;
          const bottom = bounds.getCenter(new Vector3()).setY(bounds.min.y).applyMatrix4(part.restMatrix);
          const forward = new Vector3(0, 0, 1);
          const scale = new Vector3().setFromMatrixScale(fit).x;
          apply(part, center.y < top.y && top.distanceTo(center) < .21
            ? fitRegionalSegment([neckJoint, bottom], [top, center], forward,
              forward.clone().applyQuaternion(instance.rotation), scale) : null);
        } else apply(part, fit);
      }
      return Math.max(...anchors.map((point, index) =>
        distanceTo(pixel.copy(point).applyMatrix4(fit), landmarks[index])*height/(camera.top-camera.bottom)));
    }

    function updateFoot(instance: Instance, foot: RegionalFoot, aspect: number, alpha: number) {
      const latest = [foot.heel, foot.toe, foot.ankle].map(point => videoPoint(point, aspect, foot.ankle.z ?? 0));
      if (!latest.every(inView)) { hide(instance); return; }
      const [heel, toe, ankle] = follow(instance, latest, alpha);
      const fit = fitLandmarkPlane(footSource, { base: heel, middle: toe, tip: ankle }, foot.side === 'left');
      if (!fit) { hide(instance); return; }
      instance.centerX = pointOnCanvas(heel.clone().lerp(toe, .5))[0];
      for (const part of instance.parts) apply(part, fit);
    }

    function resize() {
      width = element.clientWidth;
      height = element.clientHeight;
      if (width && height) renderer.setSize(width, height, false);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(element);
    resize();

    function animate(time: number) {
      frame = requestAnimationFrame(animate);
      if (!width || !height || lost) return;
      const view = current.current;
      if (view.hands.length) load('hand');
      if (view.face) load('head');
      if (view.feet.length) load('foot');
      const ratio = Math.max(width/view.aspect, height);
      camera.left = (view.aspect-width/ratio)/2;
      camera.right = view.aspect-camera.left;
      camera.bottom = (1-height/ratio)/2;
      camera.top = 1-camera.bottom;
      camera.updateProjectionMatrix();

      const alpha = 1-Math.exp(-Math.min(125, time-previousTime)/27);
      previousTime = time;
      let handError = 0, faceError = 0;
      const activeMesh = preferred?.userData.term === view.selected ? preferred : undefined;
      for (const [kind, { instances }] of models) instances.forEach((instance, index) => {
        const side = index === 0 ? 'left' : 'right';
        const hand = kind === 'hand' ? view.hands.find(value => value.side === side) : undefined;
        const foot = kind === 'foot' ? view.feet.find(value => value.side === side) : undefined;
        if (hand) handError = Math.max(handError, updateHand(instance, hand, view.aspect, alpha));
        else if (kind === 'head' && view.face) faceError = updateHead(instance, view.face, view.neck, view.aspect, alpha);
        else if (foot) updateFoot(instance, foot, view.aspect, alpha);
        else hide(instance);

        for (const part of instance.parts) {
          part.mesh.material = part.mesh.userData.term === view.selected
            && (!activeMesh || activeMesh === part.mesh)
            ? highlight : part.material;
        }
      });
      renderer.render(scene, camera);
      const next: BoneTarget[] = [];
      let count = 0;
      for (const { instances } of models.values()) for (const instance of instances) {
        if (!instance.group.visible) continue;
        count += instance.parts.filter(part => part.mesh.visible).length;
        const projected = projectBones(instance.group, camera, preferred)
          .map(target => ({ ...target, centerX: instance.centerX }));
        next.push(...projected);
        const index = projected.find(target => target.id === 'phalanx_index_proximal');
        if (index) next.push({ ...index, id: 'hand_phalanges' });
      }
      if (next.length !== targets.length || next.some((target, index) =>
        target.id !== targets[index]?.id || target.source !== targets[index]?.source
        || Math.abs(target.x-targets[index].x)*width > .75 || Math.abs(target.y-targets[index].y)*height > .75,
      )) {
        targets = next;
        view.onTargets(targets);
      }
      element.dataset.regionalBones = String(count);
      element.dataset.regionalFeet = String(models.get('foot')?.instances.filter(instance =>
        instance.group.visible && instance.parts.some(part => part.mesh.visible)).length ?? 0);
      if (view.hands.length) element.dataset.handErrorPx = handError.toFixed(2);
      else delete element.dataset.handErrorPx;
      if (view.face) element.dataset.faceErrorPx = faceError.toFixed(2);
      else delete element.dataset.faceErrorPx;
      if (count) view.onFrame?.(time);
    }
    frame = requestAnimationFrame(animate);

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('button, dialog, a, .bone-label-card')) return;
      const box = canvas.getBoundingClientRect();
      const position = new Vector2((event.clientX-box.left)/box.width, (event.clientY-box.top)/box.height);
      if (position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1) return;
      ray.setFromCamera(new Vector2(position.x*2-1, 1-position.y*2), camera);
      const visible = [...models.values()].flatMap(loaded => loaded.instances.flatMap(instance =>
        instance.group.visible ? instance.parts.filter(part => part.mesh.visible).map(part => part.mesh) : [],
      ));
      const hit = ray.intersectObjects(visible, false)[0]?.object;
      preferred = hit instanceof Mesh ? hit : undefined;
      const direct = preferred?.userData.term as string | undefined;
      if (direct) {
        current.current.onSelect(direct);
        event.stopPropagation();
        return;
      }
      if (target instanceof Element && target.closest('image[data-part]')) return;
      let minimum = 22;
      let nearest: BoneTarget | undefined;
      for (const candidate of targets) {
        const distance = Math.hypot((position.x-candidate.x)*box.width, (position.y-candidate.y)*box.height);
        if (distance >= minimum) continue;
        minimum = distance;
        nearest = candidate;
      }
      if (nearest) { current.current.onSelect(nearest.id); event.stopPropagation(); }
    }

    function onContextLost(event: Event) {
      event.preventDefault();
      lost = true;
      setFailed(true);
      targets = [];
      current.current.onTargets(targets);
    }
    function onContextRestored() { lost = false; setFailed(false); }
    parent.addEventListener('click', onClick, true);
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      parent.removeEventListener('click', onClick, true);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      for (const { model } of models.values()) disposeModel(model);
      highlight.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <div className="anatomy-regional-bones" style={{ opacity: props.opacity }} ref={host}>
    {failed && <p className="anatomy-viewer-note" role="alert">El visor de huesos regionales necesita WebGL y los recursos anatómicos descargados.</p>}
  </div>;
}
