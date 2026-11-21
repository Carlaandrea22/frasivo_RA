import { Box3, CatmullRomCurve3, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector3, type BufferGeometry, type Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { SoftwareTermId } from './catalog';

const green = '#248a70', mint = '#b3dfbc', gold = '#edc65a', ink = '#254e49', coral = '#dc896b', violet = '#a59bc9';
export function createSoftwareScene(id: SoftwareTermId): Group {
  const root = new Group(); root.name = id;
  const mesh = (geometry: BufferGeometry, color: string, x = 0, y = 0, z = 0) => {
    const item = new Mesh(geometry, new MeshStandardMaterial({ color, roughness: .42, metalness: .08 }));
    item.position.set(x, y, z); root.add(item); return item;
  };
  const block = (x: number, y: number, z: number, w: number, h: number, d: number, color = green) => mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * .13), color, x, y, z);
  const ball = (x: number, y: number, z: number, r: number, color = green) => mesh(new SphereGeometry(r, 24, 16), color, x, y, z);
  const link = (a: number[], b: number[], color = mint, radius = .045) => {
    const start = new Vector3(...a), end = new Vector3(...b), direction = end.clone().sub(start);
    const item = mesh(new CylinderGeometry(radius, radius, direction.length(), 12), color);
    item.position.copy(start.add(end).multiplyScalar(.5)); item.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
  };
  const arrow = (x: number, y: number, z: number, length = .8) => {
    link([x - length / 2, y, z], [x + length / 2, y, z], gold, .065);
    const tip = mesh(new CylinderGeometry(0, .17, .3, 16), gold, x + length / 2, y, z); tip.rotation.z = -Math.PI / 2;
  };
  const server = (x: number, y: number, z: number) => {
    block(x, y, z, .72, 1.3, .64, ink);
    for (let i = 0; i < 3; i++) { block(x, y - .38 + i * .38, z + .34, .53, .22, .08, mint); ball(x + .16, y - .38 + i * .38, z + .4, .045, gold); }
  };
  switch (id) {
    case 'array':
      block(0, -.48, 0, 3.5, .16, .9, ink);
      for (let i = 0; i < 5; i++) {
        block((i - 2) * .66, 0, 0, .54, .7, .65, i === 2 ? gold : green);
        for (let dot = 0; dot <= i; dot++) ball((i - 2) * .66 + (dot % 3 - 1) * .12, -.13 + Math.floor(dot / 3) * .19, .34, .035, '#ffffff');
      }
      break;
    case 'stack':
      for (let i = 0; i < 5; i++) block(0, -.85 + i * .43, 0, 1.7, .29, 1.1, i === 4 ? gold : i % 2 ? mint : green);
      break;
    case 'queue':
      block(0, -.5, 0, 3.6, .14, .85, ink);
      for (let i = 0; i < 4; i++) ball(-1.2 + i * .75, 0, 0, .29, i === 3 ? gold : green);
      arrow(0, .65, 0, 1.7); break;
    case 'thread':
      for (let strand = 0; strand < 3; strand++) {
        const points = Array.from({ length: 35 }, (_, i) => {
          const t = i / 34, angle = t * Math.PI * 3 + strand * Math.PI * 2 / 3;
          return new Vector3(-1.45 + t * 2.9, Math.sin(angle) * .45, Math.cos(angle) * .45);
        });
        mesh(new TubeGeometry(new CatmullRomCurve3(points), 70, .085, 10, false), [green, gold, violet][strand]);
        ball(points[0].x, points[0].y, points[0].z, .14, [green, gold, violet][strand]);
        ball(points[34].x, points[34].y, points[34].z, .14, [green, gold, violet][strand]);
      }
      break;
    case 'repository':
      block(0, -.8, 0, 2.6, .22, 1.25, ink);
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * .75; block(x, -.07, 0, .57, 1.05, .16, [green, mint, gold][i]);
        for (let row = 0; row < 3; row++) block(x - .04, .15 - row * .19, .095, .29, .04, .025, '#ffffff');
        link([x, .55, 0], [0, 1.05, 0]); ball(x, .55, 0, .09, gold);
      }
      ball(0, 1.05, 0, .14, green); break;
    case 'deployment':
      block(-1.15, -.45, .1, 1.1, .12, .8, ink);
      block(-1.15, .05, -.2, 1.05, .86, .12, green);
      block(-1.15, .05, -.12, .82, .63, .03, mint);
      server(1.1, .05, 0); arrow(0, .1, 0, .7);
      block(0, .75, 0, .4, .4, .4, gold); break;
    case 'framework':
      for (const x of [-.95, .95]) for (const z of [-.65, .65]) link([x, -.95, z], [x, .95, z], ink, .075);
      for (const y of [-.95, .95]) {
        for (const z of [-.65, .65]) link([-.95, y, z], [.95, y, z], green, .075);
        for (const x of [-.95, .95]) link([x, y, -.65], [x, y, .65], green, .075);
      }
      block(-.38, -.47, .1, .64, .64, .64, gold); block(.38, .34, -.1, .64, .64, .64, mint); break;
    case 'middleware':
      server(-1.3, 0, 0); server(1.3, 0, 0);
      block(0, 0, 0, .65, 1.55, .9, gold);
      arrow(-.65, 0, .05, .35); arrow(.65, 0, .05, .35);
      for (let i = 0; i < 3; i++) block(0, -.4 + i * .4, .48, .35, .12, .06, ink);
      break;
    case 'inheritance':
      block(0, .85, 0, .85, .65, .65, gold);
      for (const x of [-.9, .9]) {
        link([0, .5, 0], [x, -.4, 0], green, .065);
        block(x, -.75, 0, .85, .65, .65, green);
        block(x, -.73, .35, .32, .18, .06, gold);
      }
      break;
    case 'dependency':
      block(0, 0, 0, .85, .85, .85, green);
      [[-1.2, .65, 0], [1.2, .65, 0], [0, -1, .5]].forEach((position, i) => {
        link([0, 0, 0], position, ink, .06);
        const ring = mesh(new TorusGeometry(.29, .11, 12, 32), [gold, violet, coral][i], ...position as [number, number, number]);
        ring.rotation.y = i * .4;
        ball(...position as [number, number, number], .09, mint);
      }); break;
  }
  const bounds = new Box3().setFromObject(root); const center = bounds.getCenter(new Vector3());
  // Center each educational object independently of its geometry's origin.
  root.children.forEach(child => child.position.sub(center));
  return root;
}
export function disposeSoftwareScene(root: Group): void {
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
  root.traverse(node => { if (node instanceof Mesh) {
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
  } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  root.clear();
}
