import {
  ACESFilmicToneMapping, Color, DirectionalLight, HemisphereLight, Matrix4, MeshStandardMaterial, PerspectiveCamera,
  NoToneMapping, Raycaster, Scene, Sphere, Vector2, Vector3, WebGLRenderer,
  type Material, type Object3D, type Texture,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  belongsTo, createModelScene, disposeModels, projectAnchors,
  type ModelScene, type Viewer3DAnchor, type Viewer3DProjectedAnchor,
} from './modelScene';
import { createOcclusionScheduler } from './occlusionScheduler';
import { createRoomEnvironment, loadRoomEnvironment } from './roomEnvironment';

export type ViewerStatus = 'loading' | 'ready' | 'error' | 'webgl';

export interface ViewportOptions {
  anchors?: readonly Viewer3DAnchor[];
  onProject?: (points: readonly Viewer3DProjectedAnchor[]) => void;
  onSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
}

const zoomStep = .8;
const rotationStep = Math.PI / 18;
const initialDirection = new Vector3(.14, .08, 1).normalize();

function sameAnchors(previous?: readonly Viewer3DAnchor[], next?: readonly Viewer3DAnchor[]) {
  if (previous === next) return true;
  if (!previous || !next || previous.length !== next.length) return false;
  return previous.every((anchor, index) => {
    const other = next[index];
    return anchor.id === other.id && anchor.nodeId === other.nodeId && anchor.point.every((value, i) => value === other.point[i]);
  });
}

function highlight(material: Material, color: Color) {
  const selected = material.clone();
  if (selected instanceof MeshStandardMaterial) {
    selected.emissive.copy(color);
    selected.emissiveMap = null;
    selected.emissiveIntensity = .52;
  } else if ('color' in selected && selected.color instanceof Color) {
    selected.color.lerp(color, .65);
  }
  return selected;
}

export function mountViewport(
  element: HTMLDivElement,
  src: string,
  nodeId: string | undefined,
  descriptionId: string,
  options: () => ViewportOptions,
  onStatus: (status: ViewerStatus) => void,
) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    onStatus('webgl');
    return;
  }

  const canvas = renderer.domElement;
  canvas.className = 'viewer3d__canvas';
  canvas.setAttribute('aria-label', 'Modelo en 3D');
  canvas.setAttribute('aria-describedby', descriptionId);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  element.prepend(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .001, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;

  const style = getComputedStyle(element);
  const studio = style.getPropertyValue('--viewer3d-lighting').trim() === 'studio';
  const key = new DirectionalLight(studio ? 0xfff5ea : 0xfff3e3, studio ? 1.9 : 2.15);
  key.position.set(studio ? -2.5 : 1, 3, 4);
  const fill = new DirectionalLight(studio ? 0xe5efff : 0xe3efff, studio ? .28 : .65);
  fill.position.set(studio ? 3 : -2, 1, studio ? -2 : -3);
  scene.add(new HemisphereLight(studio ? 0xffffff : 0xfff5e6, 0xbacdc7, studio ? .46 : 1.7), key, fill);

  let environment: Texture | undefined;
  let environmentAttempted = false;
  let cancelAfterPaint: (() => void) | undefined;
  let cancelEnvironment: (() => void) | undefined;

  function releaseEnvironment() {
    scene.environment = null;
    environment?.dispose();
    environment = undefined;
    environmentAttempted = false;
    renderer.toneMapping = NoToneMapping;
    if (studio) canvas.dataset.viewerLighting = 'basic';
  }

  const accent = style.getPropertyValue('--anatomy-highlight').trim() || '#fff3b0';
  const selectionColor = new Color(accent);
  const materials = new Map<ModelScene['objects'][number], Material | Material[]>();
  const ray = new Raycaster();
  const cursor = new Vector2();
  const offset = new Vector3();
  const activePointers = new Set<number>();

  let model: ModelScene | undefined;
  let loadedScenes: readonly Object3D[] = [];
  let sphere: Sphere | undefined;
  let width = 0;
  let height = 0;
  let viewDistance = 0;
  let disposed = false;
  let contextLost = false;
  let loadFailed = false;
  let reportedReady = false;
  let tap: { pointerId: number; x: number; y: number } | undefined;
  let localSelection: string | null = null;
  let selection: string | null = null;
  let lastProjection: readonly Viewer3DProjectedAnchor[] | undefined;
  let lastInputs: { model?: ModelScene; anchors?: readonly Viewer3DAnchor[]; width: number; height: number; layers: number } | undefined;
  const lastCamera = new Matrix4();
  const lastLens = new Matrix4();
  const blockedAnchors: boolean[] = [];
  const occlusion = createOcclusionScheduler(() => reportProjection(true));

  function reportProjection(refreshOcclusion = false) {
    const { anchors, onProject } = options();
    if (!onProject) {
      occlusion.cancel();
      lastProjection = undefined;
      lastInputs = undefined;
      return;
    }
    const projectedModel = contextLost ? undefined : model;
    const layers = camera.layers.mask;
    const anchorsChanged = !lastInputs || lastInputs.model !== projectedModel || !sameAnchors(lastInputs.anchors, anchors);
    const projectionChanged = !lastInputs || lastInputs.width !== width || lastInputs.height !== height
      || lastInputs.layers !== layers || !lastLens.equals(camera.projectionMatrix) || !lastCamera.equals(camera.matrixWorld);
    if (!refreshOcclusion && !anchorsChanged && !projectionChanged) return;
    if (anchorsChanged) blockedAnchors.length = 0;
    lastInputs = { model: projectedModel, anchors, width, height, layers };
    lastCamera.copy(camera.matrixWorld);
    lastLens.copy(camera.projectionMatrix);
    let points: Viewer3DProjectedAnchor[] = [];
    if (anchors?.length && projectedModel && width && height) {
      points = projectAnchors(projectedModel, camera, anchors, width, height, {
        blocked: blockedAnchors, sample: projectedModel.occlusion.ready && (refreshOcclusion || occlusion.sample(anchorsChanged)),
      });
    } else {
      occlusion.cancel();
    }
    if (lastProjection?.length === points.length && points.every((point, index) => {
      const previous = lastProjection![index];
      return previous.id === point.id && previous.x === point.x && previous.y === point.y && previous.visible === point.visible;
    })) return;
    lastProjection = points;
    onProject(points);
  }

  function scheduleEnvironment() {
    environmentAttempted = true;
    let cancelled = false;
    const applyEnvironment = () => {
      void loadRoomEnvironment().then(faces => {
        if (cancelled) return;
        environment = createRoomEnvironment(faces);
        scene.environment = environment;
        scene.environmentIntensity = .4;
        renderer.toneMapping = ACESFilmicToneMapping;
        draw();
        canvas.dataset.viewerLighting = 'studio';
      }).catch(() => {
        // Direct lights remain available when the environment cannot be loaded.
        if (!cancelled && environment) {
          releaseEnvironment();
          environmentAttempted = true;
        }
      });
    };
    if (typeof requestIdleCallback === 'function') {
      const idle = requestIdleCallback(applyEnvironment);
      cancelEnvironment = () => {
        cancelled = true;
        cancelIdleCallback(idle);
      };
    } else {
      const timer = setTimeout(applyEnvironment, 0);
      cancelEnvironment = () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }

  function scheduleEnhancements(currentModel: ModelScene) {
    const { anchors, onProject } = options();
    const shouldBuild = Boolean(onProject && anchors?.length && !currentModel.occlusion.started);
    const shouldLight = studio && !environmentAttempted;
    if (cancelAfterPaint || (!shouldBuild && !shouldLight)) return;

    // The second animation callback follows a browser paint opportunity for the model and labels.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        cancelAfterPaint = undefined;
        if (disposed || contextLost) return;
        const { anchors, onProject } = options();
        if (onProject && anchors?.length) currentModel.occlusion.build(() => {
          occlusion.sample(true);
          reportProjection(true);
        });
        if (shouldLight) scheduleEnvironment();
      });
    });
    cancelAfterPaint = () => cancelAnimationFrame(frame);
  }

  function cancelEnhancements() {
    cancelAfterPaint?.();
    cancelAfterPaint = undefined;
    cancelEnvironment?.();
    cancelEnvironment = undefined;
    model?.occlusion.cancel();
  }

  function draw() {
    const drawable = width > 0 && height > 0 && !contextLost;
    if (drawable) renderer.render(scene, camera);
    reportProjection();
    if (!drawable || !model || disposed) return;
    if (!reportedReady) {
      reportedReady = true;
      onStatus('ready');
    }
    scheduleEnhancements(model);
  }

  function clearHighlight() {
    for (const [object, original] of materials) {
      for (const material of [object.material].flat()) material.dispose();
      object.material = original;
    }
    materials.clear();
  }

  function sync() {
    const { selectedNodeId } = options();
    const selected = selectedNodeId === undefined ? localSelection : selectedNodeId;
    if (model && selection !== selected) {
      clearHighlight();
      selection = selected;
      const node = selected === null ? undefined : model.nodes.get(selected);
      if (node) for (const object of model.objects) {
        if (!belongsTo(object, node)) continue;
        materials.set(object, object.material);
        object.material = Array.isArray(object.material)
          ? object.material.map(material => highlight(material, selectionColor))
          : highlight(object.material, selectionColor);
      }
    }
    draw();
  }

  function frame() {
    if (!sphere) return;
    const radius = Math.max(sphere.radius, .000001);
    const vertical = camera.fov * Math.PI / 360;
    const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const fit = radius / Math.sin(Math.min(vertical, horizontal)) * 1.08;
    const zoom = viewDistance ? controls.getDistance() / viewDistance : 1;
    if (viewDistance) offset.copy(camera.position).sub(controls.target).normalize();
    else offset.copy(initialDirection);

    viewDistance = fit;
    controls.target.copy(sphere.center);
    controls.minDistance = radius * .35;
    controls.maxDistance = fit * 3;
    camera.near = radius * .002;
    camera.far = controls.maxDistance + radius * 3;
    camera.position.copy(sphere.center).addScaledVector(offset, fit * zoom);
    camera.updateProjectionMatrix();
    // The caller draws once after framing; suppress OrbitControls' implicit draw.
    controls.removeEventListener('change', draw);
    controls.update();
    controls.addEventListener('change', draw);
  }

  function resize() {
    const nextWidth = element.clientWidth, nextHeight = element.clientHeight;
    if (width === nextWidth && height === nextHeight) return;
    width = nextWidth;
    height = nextHeight;
    if (width && height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      frame();
    }
    draw();
  }

  function reset() {
    if (!sphere) return;
    camera.position.copy(sphere.center).addScaledVector(initialDirection, viewDistance);
    controls.update();
  }

  function zoomIn() { if (model && !contextLost) controls.dollyIn(zoomStep); }
  function zoomOut() { if (model && !contextLost) controls.dollyOut(zoomStep); }

  function keyboard(event: KeyboardEvent) {
    if (!model || contextLost) return;
    switch (event.key) {
      case 'ArrowLeft': controls.rotateLeft(rotationStep); break;
      case 'ArrowRight': controls.rotateLeft(-rotationStep); break;
      case 'ArrowUp': controls.rotateUp(rotationStep); break;
      case 'ArrowDown': controls.rotateUp(-rotationStep); break;
      case '+': case '=': zoomIn(); break;
      case '-': zoomOut(); break;
      case 'Home': reset(); break;
      default: return;
    }
    event.preventDefault();
  }

  function start(event: PointerEvent) {
    activePointers.add(event.pointerId);
    tap = activePointers.size === 1 && event.button === 0
      ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY } : undefined;
  }

  function move(event: PointerEvent) {
    if (tap?.pointerId === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 7) {
      tap = undefined;
    }
  }

  function finish(event: PointerEvent) {
    activePointers.delete(event.pointerId);
    if (tap?.pointerId !== event.pointerId) return;
    tap = undefined;
    if (!model || contextLost || event.type === 'pointercancel') return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cursor.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(cursor, camera);
    const hit = ray.intersectObjects(model.objects, false)[0];
    const selected = hit ? model.selectionId(hit.object) : null;
    localSelection = selected;
    options().onSelect?.(selected);
    sync();
  }

  function lost(event: Event) {
    event.preventDefault();
    contextLost = true;
    reportedReady = false;
    occlusion.cancel();
    cancelEnhancements();
    releaseEnvironment();
    controls.enabled = false;
    canvas.tabIndex = -1;
    onStatus('webgl');
    reportProjection();
  }

  function restored() {
    contextLost = false;
    controls.enabled = Boolean(model);
    canvas.tabIndex = model ? 0 : -1;
    if (!model) onStatus(loadFailed ? 'error' : 'loading');
    draw();
  }

  const observer = new ResizeObserver(resize);
  const document = canvas.ownerDocument;
  controls.enabled = false;
  controls.addEventListener('change', draw);
  canvas.addEventListener('keydown', keyboard);
  canvas.addEventListener('pointerdown', start);
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', finish);
  document.addEventListener('pointercancel', finish);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('webglcontextrestored', restored);
  observer.observe(element);
  resize();

  void new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(src).then(gltf => {
    if (disposed) {
      disposeModels(gltf.scenes);
      return;
    }
    loadedScenes = gltf.scenes;
    model = createModelScene(gltf.scene, nodeId);
    if (!model) throw new Error('El modelo no contiene la pieza solicitada.');
    scene.add(gltf.scene);
    sphere = model.bounds.getBoundingSphere(new Sphere());
    controls.enabled = !contextLost;
    canvas.tabIndex = contextLost ? -1 : 0;
    frame();
    sync();
  }).catch(() => {
    if (disposed) return;
    loadFailed = true;
    if (!contextLost) onStatus('error');
  });

  return {
    sync, reset, zoomIn, zoomOut,
    dispose() {
      disposed = true;
      occlusion.cancel();
      cancelEnhancements();
      observer.disconnect();
      controls.removeEventListener('change', draw);
      controls.dispose();
      canvas.removeEventListener('keydown', keyboard);
      canvas.removeEventListener('pointerdown', start);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      clearHighlight();
      model?.occlusion.dispose();
      disposeModels(loadedScenes);
      releaseEnvironment();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
