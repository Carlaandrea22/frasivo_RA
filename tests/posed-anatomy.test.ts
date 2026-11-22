import { readFile } from 'node:fs/promises';
import { Mesh } from 'three';
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
  } finally {
    for (const model of [bones, muscles, organs]) disposeSkeleton(model);
  }
});
