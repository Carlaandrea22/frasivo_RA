import { readFileSync } from 'node:fs';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import anchors from '../assets/anatomy/body/anchors.json';
import type { BodyPoint } from '../src/features/cuerpo/anatomy';
import { landmark } from '../src/features/cuerpo/atlasAlignment';
import { disposeSkeleton, poseSkeleton } from '../src/features/cuerpo/posedSkeleton';

const world: BodyPoint[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
for (const joint of Object.keys(landmark) as (keyof typeof landmark)[]) {
  const [x, y, z] = anchors.anchors[joint];
  world[landmark[joint]] = { x, y: -y, z: -z, visibility: 1 };
}
world[landmark.eye_left] = { x: .114, y: -1.56, z: -.18, visibility: 1 };
world[landmark.eye_right] = { x: .048, y: -1.57, z: -.16, visibility: 1 };
world[landmark.elbow_left] = { x: .39, y: -1.15, z: -.071, visibility: 1 };
world[landmark.wrist_left] = { x: .36, y: -1.28, z: -.27, visibility: 1 };
world[landmark.knee_left] = { x: .17, y: -.42, z: -.24, visibility: 1 };
world[landmark.heel_left] = { x: .05, y: .02, z: -.026, visibility: 1 };

function vertices(mesh: Mesh, filter = (_point: Vector3) => true) {
  return Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) =>
    new Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i),
  ).filter(filter).map(point => point.applyMatrix4(mesh.matrixWorld));
}

function gap(one: Vector3[], other: Vector3[]) {
  let nearest = Infinity;
  for (const a of one) {
    for (const b of other) {
      nearest = Math.min(nearest, a.distanceToSquared(b));
    }
  }
  return Math.sqrt(nearest);
}

describe('esqueleto fijado', () => {
  it('mantiene en contacto los huesos de las articulaciones al flexionarlas', async () => {
    const bytes = readFileSync(new URL('../assets/anatomy/body/bones.glb', import.meta.url));
    const { scene } = await new GLTFLoader().parseAsync(new Uint8Array(bytes).buffer, '');
    const posed = poseSkeleton(scene, world);
    const mesh = (name: string) => posed.getObjectByName(name) as Mesh;
    const pairs = [
      ['humerus', 'ulna'], ['radius', 'carpals'], ['femur', 'tibia'], ['tibia', 'tarsals'],
    ];
    const neck = vertices(mesh('spine'), point => point.y > 1.435);
    const cranialBase = vertices(mesh('skull'), point => point.y < 1.465);
    expect(gap(neck, cranialBase), 'cráneo y cuello').toBeLessThan(.002);
    for (const side of ['left', 'right']) {
      for (const [upper, lower] of pairs) {
        const a = `${upper}_${side}`, b = `${lower}_${side}`;
        expect(gap(vertices(mesh(a)), vertices(mesh(b))), `${a} y ${b}`).toBeLessThan(.002);
      }
    }
    const floor = new Box3().setFromObject(posed, true).min.y;
    expect(floor).toBeCloseTo(0, 5);
    expect(posed.children).toHaveLength(39);
    for (const id of ['scapula_left', 'scapula_right', 'sacrum']) expect(mesh(id)).toBeInstanceOf(Mesh);
    disposeSkeleton(posed);
  });
});
