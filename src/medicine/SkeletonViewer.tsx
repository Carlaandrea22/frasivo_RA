import { useEffect, useRef, useState } from 'react';
import {
  Box3, DirectionalLight, GridHelper, Group, HemisphereLight, PerspectiveCamera,
  Raycaster, Scene, Sphere, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { anatomyParts } from './anatomy';

export default function SkeletonViewer({ model }: { model: Group }) {
  const host = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = host.current!;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, .01, 30);
    scene.add(model, new HemisphereLight(0xfff5e6, 0xbacdc7, 2.1));
    const key = new DirectionalLight(0xfff3e3, 2.3);
    key.position.set(1, 3, 4);
    scene.add(key);
    const floor = new GridHelper(4, 20, 0x698a80, 0xc7d8d0);
    scene.add(floor);
    const bounds = new Box3().setFromObject(model, true);
    const sphere = bounds.getBoundingSphere(new Sphere());
    const size = bounds.getSize(new Vector3());
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = Math.max(.18, sphere.radius*.24);
    controls.maxDistance = sphere.radius*7;
    controls.maxPolarAngle = Math.PI*.53;
    controls.target.copy(sphere.center);
    const resize = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      renderer.setSize(element.clientWidth, element.clientHeight);
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      draw();
    };
    const draw = () => renderer.render(scene, camera);
    const vertical = Math.tan(camera.fov * Math.PI / 360);
    const horizontal = vertical * element.clientWidth / Math.max(1, element.clientHeight);
    const distance = Math.max(size.y / vertical, size.x / Math.max(.1, horizontal)) * .57 + size.z * .5;
    camera.position.copy(controls.target).addScaledVector(new Vector3(.18, .07, 1).normalize(), distance);
    controls.update();

    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-label', 'Esqueleto posado');
    element.appendChild(renderer.domElement);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    controls.addEventListener('change', draw);
    resize();

    const ray = new Raycaster();
    const pointers = new Set<number>();
    let tap: { x: number; y: number; id: number } | undefined;
    const start = (event: PointerEvent) => {
      pointers.add(event.pointerId);
      tap = pointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId } : undefined;
    };
    const move = (event: PointerEvent) => {
      if (tap && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 7) tap = undefined;
    };
    const finish = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (tap?.id !== event.pointerId || event.type === 'pointercancel') { tap = undefined; return; }
      tap = undefined;
      const box = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new Vector2((event.clientX-box.left)/box.width*2-1, 1-(event.clientY-box.top)/box.height*2), camera);
      const hit = ray.intersectObject(model, true)[0];
      setTerm(anatomyParts.find(part => part.id === hit?.object.userData.term)?.en ?? '');
    };
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); };
    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
    canvas.addEventListener('webglcontextlost', lost);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', finish);
      canvas.removeEventListener('pointercancel', finish);
      canvas.removeEventListener('webglcontextlost', lost);
      controls.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      scene.remove(model);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [model]);

  return <>
    <div className="anatomy-skeleton-canvas" ref={host}/>
    {failed && <p className="anatomy-viewer-note" role="alert">El visor 3D necesita WebGL en este dispositivo.</p>}
    {term && <p className="anatomy-viewer-note" role="status" lang="en">{term}</p>}
  </>;
}
