import { readFile } from 'node:fs/promises';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { expect, it } from 'vitest';
import anchors from '../assets/anatomy/body/anchors.json';
import type { AnatomyLayer, BodyPoint } from '../src/features/cuerpo/anatomy';
import { landmark } from '../src/features/cuerpo/atlasAlignment';
import { disposeSkeleton, poseAnatomyLayer, poseSkeleton } from '../src/features/cuerpo/posedSkeleton';

async function layerScene(layer: AnatomyLayer) {
  const data = await readFile(new URL(`../assets/anatomy/body/${layer}.glb`, import.meta.url));
  return (await new GLTFLoader().parseAsync(new Uint8Array(data).buffer, '')).scene;
}

it('usa las articulaciones capturadas y el mismo origen en las tres capas fijadas', async () => {
  const world: BodyPoint[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  for (const joint of Object.keys(landmark) as (keyof typeof landmark)[]) {
    const [x, y, z] = anchors.anchors[joint];
    world[landmark[joint]] = { x, y: -y, z: -z, visibility: 1 };
  }
  world[landmark.elbow_left] = { x: .39, y: -1.15, z: -.071, visibility: 1 };
  world[landmark.wrist_left] = { x: .36, y: -1.28, z: -.27, visibility: 1 };
  const [boneScene, muscleScene, organScene] = await Promise.all([
    layerScene('bones'), layerScene('muscles'), layerScene('organs'),
  ]);
  expect(poseAnatomyLayer).toBeTypeOf('function');
  const bones = poseSkeleton(boneScene, world);
  const muscles = poseAnatomyLayer(bones, muscleScene, 'muscles');
  const organs = poseAnatomyLayer(bones, organScene, 'organs');
  try {
    const placements = [
      [muscles, 'biceps_brachii_left', 'humerus_left'],
      [muscles, 'gastrocnemius_left', 'tibia_left'],
      [organs, 'brain', 'skull'],
      [organs, 'heart', 'sternum'],
      [organs, 'small_intestine', 'sternum'],
    ] as const;
    for (const [model, partName, boneName] of placements) {
      const part = model.getObjectByName(partName);
      const bone = bones.getObjectByName(boneName);
      expect(part).toBeInstanceOf(Mesh);
      expect(part?.matrixWorld.elements).toEqual(bone?.matrixWorld.elements);
    }
    expect(muscles.position.toArray()).toEqual(bones.position.toArray());
    expect(organs.position.toArray()).toEqual(bones.position.toArray());
    expect(muscles.userData.calibrationJoints).toEqual(bones.userData.calibrationJoints);
    expect(organs.userData.calibrationJoints).toEqual(bones.userData.calibrationJoints);

    const bounds = (model: typeof bones, id: string) => new Box3().setFromObject(model.getObjectByName(id)!, true);
    const pelvis = bounds(bones, 'pelvis_left').union(bounds(bones, 'pelvis_right'));
    const ribs = bounds(bones, 'ribs_left').union(bounds(bones, 'ribs_right'));
    const center = ribs.getCenter(new Vector3());
    const lungs = bounds(organs, 'lungs');
    const heart = bounds(organs, 'heart').getCenter(new Vector3());
    const colon = bounds(organs, 'large_intestine');
    const shoulderSpan = world[landmark.shoulder_left].x - world[landmark.shoulder_right].x;
    const lungSize = lungs.getSize(new Vector3());
    expect(lungSize.x / shoulderSpan).toBeGreaterThan(.86);
    expect(lungSize.x / shoulderSpan).toBeLessThan(.96);
    expect(lungSize.y / ribs.getSize(new Vector3()).y).toBeGreaterThan(.77);
    expect(heart.x - center.x).toBeGreaterThan(.015);
    expect(heart.x - center.x).toBeLessThan(.05);
    expect(heart.z).toBeGreaterThan(lungs.getCenter(new Vector3()).z);
    expect(bounds(organs, 'heart').max.z).toBeLessThan(bounds(bones, 'sternum').max.z);
    expect(bounds(organs, 'liver').getCenter(new Vector3()).x).toBeLessThan(center.x);
    expect(bounds(organs, 'stomach').getCenter(new Vector3()).x).toBeGreaterThan(center.x);
    expect(colon.getSize(new Vector3()).x / pelvis.getSize(new Vector3()).x).toBeGreaterThan(.86);
    expect(colon.min.y).toBeLessThan(pelvis.getCenter(new Vector3()).y);
    expect(colon.min.y).toBeGreaterThan(pelvis.min.y);
  } finally {
    for (const model of [bones, muscles, organs]) disposeSkeleton(model);
  }
});
