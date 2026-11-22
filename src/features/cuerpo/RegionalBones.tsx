import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  DirectionalLight, Group, HemisphereLight, Matrix4, Mesh, MeshStandardMaterial,
  OrthographicCamera, Quaternion, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import handModel from '../../../assets/anatomy/regions/hand.glb?url';
import headModel from '../../../assets/anatomy/regions/head.glb?url';
import footModel from '../../../assets/anatomy/regions/foot.glb?url';
import handMuscles from '../../../assets/anatomy/regions/hand-muscles.glb?url';
import headMuscles from '../../../assets/anatomy/regions/head-muscles.glb?url';
import headOrgans from '../../../assets/anatomy/regions/head-organs.glb?url';
import rest from '../../../assets/anatomy/regions/anchors.json';
import bodyRest from '../../../assets/anatomy/body/anchors.json';
import type { AnatomyLayer } from './anatomy';
import type { BoneTarget } from './boneLabelPlacement';
import { projectBones } from './boneProjection';
import type { FaceRegion, HandRegion } from './regionalDetection';
import {
  faceMuscleMotion, makeBrainWindow, makeFaceMuscleSkin, makeHandTendonSkin, makeMouthOpening,
  regionalSurfaceVertices, smoothFaceMotion, updateFaceMuscleSkin, updateHandTendonSkin,
} from './regionalLayerMeshes';
import {
  faceRotation, fitHeadProjection, fitLandmarkPlane, fitRegionalSegment, handCrossSectionScale, handMuscleView,
  videoPoint, visibleNeckFit, type HandMuscleView, type RegionalFoot, type RegionalNeck,
} from './regionalTransforms';
import './regionalBones.css';

interface Props {
  layer?: AnatomyLayer;
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
  diagnostic?: boolean;
}

const assets = {
  hand: { url: handModel, layer: 'bones', count: 2 },
  head: { url: headModel, layer: 'bones', count: 1 },
  foot: { url: footModel, layer: 'bones', count: 2 },
  'hand-muscles': { url: handMuscles, layer: 'muscles', count: 2 },
  'head-muscles': { url: headMuscles, layer: 'muscles', count: 1 },
  'head-organs': { url: headOrgans, layer: 'organs', count: 1 },
} as const;
type Kind = keyof typeof assets;
const headAnchorIds = [263, 362, 33, 133, 4, 152, 10];
const headSource = ['eyeLeft', 'eyeRight', 'nose', 'chin'].map(id =>
  new Vector3().fromArray(rest.head[id as keyof typeof rest.head]));
const jawPivot = new Vector3().fromArray(rest.head.jawPivot);
const neckJoint = new Vector3().fromArray(rest.head.neckJoint);
const shoulderCenter = new Vector3().fromArray(bodyRest.anchors.shoulder_left)
  .lerp(new Vector3().fromArray(bodyRest.anchors.shoulder_right), .5);
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
const handSegments = [...handRig.values()];
const palmarParts = new Set(['thenar_eminence', 'hypothenar_eminence', 'flexor_tendons']);
const neckParts = new Set(['sternocleidomastoid', 'trachea', 'thyroid_gland']);
const layerNames = { bones: 'Huesos', muscles: 'Músculos', organs: 'Órganos' } satisfies Record<AnatomyLayer, string>;

interface Part {
  mesh: Mesh;
  restMatrix: Matrix4;
  material: MeshStandardMaterial;
  highlight?: MeshStandardMaterial;
  skin?: ReturnType<typeof makeHandTendonSkin>;
  ownsGeometry?: boolean;
  ownsMaterial?: boolean;
  anchors?: number[];
}

interface Instance {
  group: Group;
  parts: Part[];
  points: Vector3[];
  centerX: number;
  rotation?: Quaternion;
  jaw?: number;
  handView?: HandMuscleView;
  faceMotion: Map<number, Vector3>;
  brainWindow?: ReturnType<typeof makeBrainWindow>;
  mouthOpening?: ReturnType<typeof makeMouthOpening>;
}

function termId(name: string) {
  if (name === 'metacarpal_thumb') return 'thumb';
  if (name.startsWith('metacarpal_')) return 'metacarpals';
  if (name.startsWith('metatarsal_')) return 'metatarsals';
  if (name.startsWith('sternocleidomastoid_')) return 'sternocleidomastoid';
  return name;
}

function makeInstance(model: Group, kind: Kind, ivory: MeshStandardMaterial): Instance {
  const group = new Group();
  const parts: Part[] = [];
  const bone = assets[kind].layer === 'bones';
  const brainWindow = kind === 'head-organs' ? makeBrainWindow() : undefined;
  const mouthOpening = kind === 'head-muscles' ? makeMouthOpening() : undefined;
  if (brainWindow) group.add(brainWindow.window);
  model.updateWorldMatrix(true, true);
  model.traverse(node => {
    if (!(node instanceof Mesh) || !(node.material instanceof MeshStandardMaterial)) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    const mesh = node.clone(false);
    const id = termId(node.name);
    mesh.userData.term = id;
    const ownsMaterial = id === 'brain' || id === 'orbicularis_oris';
    const material = bone ? ivory : ownsMaterial ? node.material.clone() : node.material;
    mesh.material = material;
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    const part: Part = { mesh, restMatrix: node.matrixWorld.clone(), material, ownsMaterial };
    if (!bone) {
      part.highlight = material.clone();
      part.highlight.emissive.setHex(0xff9360);
      part.highlight.emissiveIntensity = .25;
      if (id === 'brain' && brainWindow) {
        brainWindow.clip(material);
        brainWindow.clip(part.highlight);
        mesh.userData.visibleAt = brainWindow.visibleAt;
        mesh.renderOrder = 1;
      }
      if (id === 'orbicularis_oris' && mouthOpening) {
        mouthOpening.clip(material);
        mouthOpening.clip(part.highlight);
        mesh.userData.visibleAt = mouthOpening.visibleAt;
      }
      const faceMuscle = kind === 'head-muscles' && !neckParts.has(id);
      const tendon = kind === 'hand-muscles' && (id === 'flexor_tendons' || id === 'extensor_tendons');
      if (faceMuscle || tendon) {
        mesh.geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
        part.ownsGeometry = true;
        part.restMatrix.identity();
        part.skin = faceMuscle ? makeFaceMuscleSkin(mesh.geometry, id) : makeHandTendonSkin(mesh.geometry, handSegments);
      }
      part.anchors = regionalSurfaceVertices(mesh);
    }
    parts.push(part);
  });
  return { group, parts, points: [], centerX: .5, faceMotion: new Map(), brainWindow, mouthOpening };
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
  instance.handView = undefined;
  instance.faceMotion.clear();
}

function distanceTo(a: Vector3, b: Vector3) {
  return Math.hypot(a.x-b.x, a.y-b.y);
}

function headLandmarks(face: FaceRegion, aspect: number) {
  const pool = headAnchorIds.map(id => face.landmarks[id]);
  if (pool.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const points = pool.map(point => videoPoint(point, aspect, pool[4].z ?? 0));
  const left = points[0].lerp(points[1], .5), right = points[2].lerp(points[3], .5);
  return [left, right, points[4], points[5], points[6]];
}

export default function RegionalBones(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  useLayoutEffect(() => { current.current = props; });
  const [failed, setFailed] = useState(false);
  const [failedLayers, setFailedLayers] = useState<AnatomyLayer[]>([]);
  const layer = props.layer ?? 'bones';

  useLayoutEffect(() => {
    host.current?.querySelector('canvas')?.setAttribute('aria-label', `${layerNames[layer]} de las regiones detectadas`);
  }, [layer]);

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
    canvas.setAttribute('aria-label', `${layerNames[current.current.layer ?? 'bones']} de las regiones detectadas`);
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
    const restPixel = new Vector3();
    let width = 0, height = 0, frame = 0, previousTime = 0;
    let disposed = false, lost = false;
    let preferred: Mesh | undefined;
    let targets: BoneTarget[] = [];
    let lastLayer: AnatomyLayer | undefined;

    function load(kind: Kind) {
      if (requested.has(kind)) return;
      requested.add(kind);
      const { url, layer, count } = assets[kind];
      const unavailable = () => setFailedLayers(previous => previous.includes(layer) ? previous : [...previous, layer]);
      void loader.loadAsync(url).then(({ scene: model }) => {
        if (disposed) { disposeModel(model); return; }
        let ivory: MeshStandardMaterial | undefined;
        model.traverse(node => {
          if (!ivory && node instanceof Mesh && node.material instanceof MeshStandardMaterial) ivory = node.material;
        });
        if (!ivory) { disposeModel(model); unavailable(); return; }
        const instances = Array.from({ length: count }, () => makeInstance(model, kind, ivory!));
        for (const instance of instances) {
          instance.group.name = `region-${kind}`;
          scene.add(instance.group);
          hide(instance);
        }
        models.set(kind, { model, instances });
      }).catch(() => { if (!disposed) unavailable(); });
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

    function updateHand(instance: Instance, hand: HandRegion, aspect: number, alpha: number, muscles: boolean) {
      const raw = hand.landmarks;
      if (raw.length !== 21 || raw.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        hide(instance);
        return 0;
      }
      const latest = raw.map(point => videoPoint(point, aspect, raw[0].z ?? 0));
      const points = follow(instance, latest, alpha);
      const [wrist, index, pinky] = [points[0], points[5], points[17]];
      const mirrored = hand.side === 'left';
      const trackedPalm = { base: wrist, middle: index, tip: pinky };
      const palm = fitLandmarkPlane(handSource, trackedPalm, mirrored);
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
      const sideScale = handCrossSectionScale(handSource, trackedPalm);
      let error = 0;
      const pixelScale = height/(camera.top-camera.bottom);
      const fitSegment = (bone: typeof handSegments[number]) => {
        const [from, to] = bone.indices;
        if (!muscles && (!inView(points[from]) || !inView(points[to]))) return null;
        const middle = from === 0 ? bone.start.clone().applyMatrix4(palm) : points[from];
        const fit = fitRegionalSegment([bone.start, bone.end], [middle, points[to]], handNormal, imageNormal, sideScale, mirrored);
        if (fit) {
          const projectedEnd = pixel.copy(bone.end).applyMatrix4(fit);
          error = Math.max(error, distanceTo(projectedEnd, latest[to])*pixelScale);
          if (from !== 0) error = Math.max(error, distanceTo(pixel.copy(bone.start).applyMatrix4(fit), latest[from])*pixelScale);
        }
        return fit;
      };

      if (!muscles) {
        for (const part of instance.parts) {
          const bone = handRig.get(part.mesh.name);
          apply(part, bone ? fitSegment(bone) : inView(wrist) ? palm : null);
        }
        return error;
      }

      instance.handView = handMuscleView(imageNormal, instance.handView);
      const inverse = palm.clone().invert();
      const localFits = handSegments.map(bone => fitSegment(bone)?.premultiply(inverse) ?? null);
      for (const part of instance.parts) {
        const facing = palmarParts.has(part.mesh.userData.term) ? 'palmar' : 'dorsal';
        const visible = facing === instance.handView;
        if (visible && part.skin) updateHandTendonSkin(part.skin, localFits);
        apply(part, visible ? palm : null);
      }
      return error;
    }

    function updateHead(instance: Instance, face: FaceRegion, neck: RegionalNeck | null | undefined,
      aspect: number, alpha: number, layer: AnatomyLayer) {
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
      const fit = fitHeadProjection(anchors, points.slice(0, 4), instance.rotation, headWeights);
      if (!fit) { hide(instance); return 0; }
      instance.centerX = pointOnCanvas(points[0].clone().lerp(points[1], .5))[0];
      const forward = new Vector3(0, 0, 1).applyQuaternion(instance.rotation);
      const shoulder = neck && videoPoint(neck.shoulderLeft, aspect, face.landmarks[4].z ?? 0)
        .lerp(videoPoint(neck.shoulderRight, aspect, face.landmarks[4].z ?? 0), .5);
      const top = neckJoint.clone().applyMatrix4(fit);
      const scale = new Vector3().setFromMatrixScale(fit).x;
      const neckFit = layer !== 'bones' && shoulder
        ? visibleNeckFit([neckJoint, shoulderCenter], top, shoulder.clone().setZ(shoulderCenter.clone().applyMatrix4(fit).z),
          instance.rotation, scale, Math.max(.21, scale*.22)) : null;
      const muscleMotion = layer === 'muscles' && smoothFaceMotion(instance.faceMotion,
        faceMuscleMotion(face.landmarks, aspect, fit, Math.max(0, Math.min(1, (forward.z-.22)/.48))), alpha);
      instance.mouthOpening?.align(face.landmarks, aspect);
      for (const part of instance.parts) {
        if (part.mesh.name === 'mandible') {
          apply(part, fit.clone().multiply(open));
        } else if (part.mesh.name === 'cervical') {
          if (!shoulder) { apply(part, null); continue; }
          const bounds = part.mesh.geometry.boundingBox!;
          const bottom = bounds.getCenter(new Vector3()).setY(bounds.min.y).applyMatrix4(part.restMatrix);
          apply(part, visibleNeckFit([neckJoint, bottom], top, shoulder, instance.rotation, scale));
        } else if (neckParts.has(part.mesh.userData.term)) {
          apply(part, neckFit);
        } else {
          if (part.skin && muscleMotion) updateFaceMuscleSkin(part.skin, instance.faceMotion);
          apply(part, fit);
          if (part.mesh.name === 'brain' && instance.brainWindow) {
            const clearance = instance.brainWindow.align(part.mesh, points[0].clone().lerp(points[1], .5), points[4]);
            element.dataset.brainRimClearancePx = (clearance*height/(camera.top-camera.bottom)).toFixed(2);
          }
        }
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

    function regionalTargets(instance: Instance) {
      const local: BoneTarget[] = [];
      for (const { mesh, anchors } of instance.parts) {
        if (!mesh.visible || !anchors) continue;
        const positions = mesh.geometry.getAttribute('position');
        const visibleAt = mesh.userData.visibleAt as ((point: Vector3) => boolean) | undefined;
        const count = local.length;
        const add = (point: Vector3) => {
          const [x, y] = pointOnCanvas(point);
          if (x < 0 || x > 1 || y < 0 || y > 1) return;
          const target = { id: mesh.userData.term as string, source: mesh.name, centerX: instance.centerX, x, y };
          if (mesh === preferred) local.unshift(target);
          else local.push(target);
        };
        for (const index of anchors) {
          pixel.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
          if (!visibleAt || visibleAt(pixel)) add(pixel);
        }
        if (visibleAt && local.length === count) {
          const center = instance.brainWindow?.window.position;
          if (!center) pixel.fromBufferAttribute(positions, anchors[0]).applyMatrix4(mesh.matrixWorld);
          const reference = center ?? pixel.clone();
          let distance = Infinity;
          for (let index = 0; index < positions.count; index += Math.max(1, Math.floor(positions.count/192))) {
            pixel.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
            const candidate = distanceTo(reference, pixel);
            if (candidate >= distance || !visibleAt(pixel)) continue;
            restPixel.copy(pixel);
            distance = candidate;
          }
          if (Number.isFinite(distance)) add(restPixel);
        }
      }
      return local;
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
      const layer = view.layer ?? 'bones';
      if (lastLayer !== layer) { preferred = undefined; lastLayer = layer; }
      if (layer === 'bones') {
        if (view.hands.length) load('hand');
        if (view.face) load('head');
        if (view.feet.length) load('foot');
      } else if (layer === 'muscles') {
        if (view.hands.length) load('hand-muscles');
        if (view.face) load('head-muscles');
      } else if (view.face) load('head-organs');
      const ratio = Math.max(width/view.aspect, height);
      camera.left = (view.aspect-width/ratio)/2;
      camera.right = view.aspect-camera.left;
      camera.bottom = (1-height/ratio)/2;
      camera.top = 1-camera.bottom;
      camera.updateProjectionMatrix();

      const alpha = 1-Math.exp(-Math.min(125, time-previousTime)/27);
      previousTime = time;
      let handError = 0, faceError = 0;
      let handView: HandMuscleView | undefined;
      const activeMesh = preferred?.userData.term === view.selected ? preferred : undefined;
      for (const [kind, { instances }] of models) instances.forEach((instance, index) => {
        if (assets[kind].layer !== layer) { hide(instance); return; }
        const side = index === 0 ? 'left' : 'right';
        const hand = kind === 'hand' || kind === 'hand-muscles' ? view.hands.find(value => value.side === side) : undefined;
        const foot = kind === 'foot' ? view.feet.find(value => value.side === side) : undefined;
        if (hand) {
          handError = Math.max(handError, updateHand(instance, hand, view.aspect, alpha, layer === 'muscles'));
          handView ??= instance.handView;
        }
        else if (kind !== 'foot' && !kind.startsWith('hand') && view.face)
          faceError = updateHead(instance, view.face, view.neck, view.aspect, alpha, layer);
        else if (foot) updateFoot(instance, foot, view.aspect, alpha);
        else hide(instance);

        for (const part of instance.parts) {
          part.mesh.material = part.mesh.userData.term === view.selected
            && (!activeMesh || activeMesh === part.mesh)
            ? part.highlight ?? highlight : part.material;
        }
      });
      renderer.render(scene, camera);
      const next: BoneTarget[] = [];
      const partIds = new Set<string>();
      const diagnosticBones = view.diagnostic && layer === 'bones' ? new Set<string>() : undefined;
      let count = 0, faceDeformation = 0;
      for (const [kind, { instances }] of models) for (const [instanceIndex, instance] of instances.entries()) {
        if (!instance.group.visible) continue;
        for (const { mesh, skin, anchors } of instance.parts) if (mesh.visible) {
          count++;
          const term = mesh.userData.term as string;
          partIds.add(term);
          if (diagnosticBones) {
            const region = kind === 'foot' || kind === 'hand' ? `${kind}_${instanceIndex === 0 ? 'left' : 'right'}` : 'head';
            diagnosticBones.add(`${region}:${term}`);
          }
          if (skin && anchors && instance.faceMotion.size) for (const index of anchors) {
            pixel.fromBufferAttribute(skin.positions, index).applyMatrix4(mesh.matrixWorld);
            restPixel.fromArray(skin.rest, index*3).applyMatrix4(mesh.matrixWorld);
            const displacement = distanceTo(pixel, restPixel)*height/(camera.top-camera.bottom);
            faceDeformation = Math.max(faceDeformation, displacement);
          }
        }
        const projected = layer === 'bones'
          ? projectBones(instance.group, camera, preferred).map(target => ({ ...target, centerX: instance.centerX }))
          : regionalTargets(instance);
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
      if (layer === 'bones') element.dataset.regionalBones = String(count);
      else delete element.dataset.regionalBones;
      element.dataset.regionalLayer = layer;
      element.dataset.regionalParts = String(count);
      element.dataset.regionalPartIds = [...partIds].join(' ');
      if (diagnosticBones) element.dataset.diagnosticBones = [...diagnosticBones].join(' ');
      if (!partIds.has('brain')) delete element.dataset.brainRimClearancePx;
      element.dataset.regionalFeet = String(models.get('foot')?.instances.filter(instance =>
        instance.group.visible && instance.parts.some(part => part.mesh.visible)).length ?? 0);
      if (handView) element.dataset.handView = handView;
      else delete element.dataset.handView;
      if (layer !== 'organs' && view.hands.length) element.dataset.handErrorPx = handError.toFixed(2);
      else delete element.dataset.handErrorPx;
      if (view.face) element.dataset.faceErrorPx = faceError.toFixed(2);
      else delete element.dataset.faceErrorPx;
      if (layer === 'muscles' && view.face) element.dataset.faceDeformationPx = faceDeformation.toFixed(2);
      else delete element.dataset.faceDeformationPx;
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
      const hit = ray.intersectObjects(visible, false).find(intersection => {
        const visibleAt = intersection.object.userData.visibleAt as ((point: Vector3) => boolean) | undefined;
        return !visibleAt || visibleAt(intersection.point);
      })?.object;
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
      for (const { model, instances } of models.values()) {
        for (const instance of instances) {
          instance.brainWindow?.window.geometry.dispose();
          instance.brainWindow?.window.material.dispose();
          for (const part of instance.parts) {
            part.highlight?.dispose();
            if (part.ownsGeometry) part.mesh.geometry.dispose();
            if (part.ownsMaterial) part.material.dispose();
          }
        }
        disposeModel(model);
      }
      highlight.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <div className="anatomy-regional-bones" style={{ opacity: props.opacity }} ref={host}>
    {(failed || failedLayers.includes(layer)) && <p className="anatomy-viewer-note" role="alert">
      El visor de {layerNames[layer].toLowerCase()} regionales necesita WebGL y los recursos anatómicos descargados.
    </p>}
  </div>;
}
