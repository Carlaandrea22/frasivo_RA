import { useEffect, useRef, useState } from 'react';
import {
  DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, OrthographicCamera,
  Raycaster, Scene, Vector2, WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import bones from '../../../assets/anatomy/body/bones.glb?url';
import muscles from '../../../assets/anatomy/body/muscles.glb?url';
import organs from '../../../assets/anatomy/body/organs.glb?url';
import type { AnatomyLayer } from './anatomy';
import { atlasParts, type atlasMatrices } from './atlasAlignment';

const models = { bones, muscles, organs };

interface Props {
  layer: AnatomyLayer;
  matrices: ReturnType<typeof atlasMatrices>;
  aspect: number;
  opacity: number;
  selected: string;
  focusSelection: boolean;
  onSelect: (id: string) => void;
  onFrame?: () => void;
  onError: () => void;
}

function dispose(model: Group) {
  model.traverse(node => {
    if (!(node instanceof Mesh)) return;
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) material.dispose();
  });
}

export default function Anatomy3D(props: Props) {
  const { layer, matrices, aspect, selected, focusSelection, opacity } = props;
  const host = useRef<HTMLDivElement>(null);
  const render = useRef<() => void>(null);
  const current = useRef(props);
  current.current = props;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = host.current!;
    const scene = new Scene();
    const camera = new OrthographicCamera(0, 1, 1, 0, .01, 20);
    camera.position.z = 4;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      current.current.onError();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene.add(new HemisphereLight(0xfff5e5, 0x8398b3, 1.55));
    const key = new DirectionalLight(0xffefe0, 2.05);
    key.position.set(-.4, 1.4, 1.8);
    scene.add(key);
    const fill = new DirectionalLight(0xe0efff, .42);
    fill.position.set(.9, .45, 1);
    scene.add(fill);
    element.appendChild(renderer.domElement);
    const ray = new Raycaster();
    let disposed = false;
    setReady(false);
    let model: Group | undefined;
    const groups = atlasParts.filter(part => part.layer === layer).map(part => {
      const group = new Group();
      group.matrixAutoUpdate = false;
      group.visible = false;
      scene.add(group);
      return { part, group, materials: [] as MeshStandardMaterial[] };
    });

    const draw = () => {
      const view = current.current;
      const focusedOrgan = layer === 'organs' && view.focusSelection ? view.selected : null;
      camera.right = view.aspect;
      camera.updateProjectionMatrix();
      let visibleParts = 0;
      for (const { part, group, materials } of groups) {
        const placement = view.matrices[part.group];
        group.visible = Boolean(placement) && group.children.length > 0;
        if (group.visible) visibleParts++;
        if (!placement) continue;
        const [a, b, c, d, x, y] = placement;
        const depth = Math.sqrt(Math.abs(a*d - b*c));
        group.matrix.set(a, -c, 0, x, -b, d, 0, 1-y, 0, 0, depth, 0, 0, 0, 0, 1);
        group.matrixWorldNeedsUpdate = true;
        for (const material of materials) {
          material.emissive.set(part.term === view.selected ? 0x564014 : 0x000000);
          material.emissiveIntensity = .65;
          const recedes = Boolean(focusedOrgan && focusedOrgan !== part.term);
          material.transparent = recedes;
          material.depthWrite = !recedes;
          material.opacity = recedes ? .17 : 1;
        }
      }
      renderer.render(scene, camera);
      element.dataset.visibleParts = String(visibleParts);
      if (focusedOrgan) element.dataset.focusedOrgan = focusedOrgan;
      else delete element.dataset.focusedOrgan;
      if (model && visibleParts > 0) view.onFrame?.();
    };

    const resize = () => {
      renderer.setSize(element.clientWidth, element.clientHeight, false);
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    render.current = draw;

    const pick = (event: MouseEvent) => {
      const box = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new Vector2((event.clientX-box.left)/box.width*2-1, 1-(event.clientY-box.top)/box.height*2), camera);
      const visible = groups.filter(({ group }) => group.visible);
      const hit = ray.intersectObjects(visible.map(({ group }) => group), true)[0];
      if (!hit) return;
      let node = hit.object;
      while (node.parent && node.parent !== scene) node = node.parent;
      const part = visible.find(({ group }) => group === node)?.part;
      if (part) current.current.onSelect(part.term);
    };
    const failed = () => current.current.onError();
    renderer.domElement.addEventListener('click', pick);
    renderer.domElement.addEventListener('webglcontextlost', failed);

    void new GLTFLoader().loadAsync(models[layer]).then(gltf => {
      if (disposed) {
        dispose(gltf.scene);
        return;
      }
      model = gltf.scene;
      for (const { part, group, materials } of groups) {
        const node = model.getObjectByName(part.id);
        if (!node) continue;
        node.traverse(child => {
          if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
            child.material = child.material.clone();
            materials.push(child.material);
          }
        });
        group.add(node);
      }
      resize();
      setReady(true);
    }).catch(() => { if (!disposed) failed(); });

    return () => {
      disposed = true;
      render.current = null;
      observer.disconnect();
      renderer.domElement.removeEventListener('click', pick);
      renderer.domElement.removeEventListener('webglcontextlost', failed);
      for (const { group } of groups) dispose(group);
      if (model) dispose(model);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [layer]);

  useEffect(() => render.current?.(), [matrices, aspect, selected, focusSelection]);

  return (
    <>
      <div ref={host} className={`anatomy-overlay anatomy-webgl layer-${layer}`} data-rendered={ready ? layer : undefined} style={{ opacity }} aria-hidden="true"/>
      {!ready && <p className="anatomy-render-message">Cargando atlas…</p>}
    </>
  );
}
