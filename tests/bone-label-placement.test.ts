import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Mesh, PerspectiveCamera, Raycaster, Vector2 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { arrangeBoneLabels, type BoneTarget } from '../src/features/cuerpo/boneLabelPlacement';
import { projectBones } from '../src/features/cuerpo/boneProjection';

const point = (id: string, x: number, y: number, centerX = .62): BoneTarget => ({ id, x, y, centerX });

describe('anclajes de las etiquetas de huesos', () => {
  it('respeta el lado proyectado de una pieza seleccionada aunque la persona esté descentrada', () => {
    const targets = [point('femur', .55, .5), point('femur', .75, .5)];
    const [label] = arrangeBoneLabels(targets, ['femur'], 'femur', { width: 375, height: 568 });
    expect(label.side).toBe('left');
    expect(label.edge / 375).toBeLessThan(label.centerX!);
  });

  it('reparte los huesos centrales y limita la altura de las tarjetas sobre el panel', () => {
    const targets = [point('femur', .66, .59, .5), point('tibia', .36, .60, .5), point('humerus', .69, .4, .5),
      point('skull', .49, .13, .5), point('skull', .51, .14, .5), point('pelvis', .45, .52, .5),
      point('pelvis', .55, .52, .5), point('ribs', .43, .38, .5), point('ribs', .57, .38, .5)];
    const labels = arrangeBoneLabels(targets, ['femur', 'tibia', 'humerus', 'skull', 'pelvis', 'ribs'], undefined,
      { width: 375, height: 560, reservedBottom: 220 });
    expect(labels).toHaveLength(6);
    expect(labels.filter(label => label.side === 'left')).toHaveLength(3);
    for (const label of labels) expect(label.top + 62).toBeLessThanOrEqual(340);
    expect(arrangeBoneLabels([point('tibia', .36, .88, .5)], ['tibia'], 'tibia',
      { width: 375, height: 560, reservedBottom: 220 })).toEqual([]);
  });

  it('los anclajes 3D se proyectan sobre la malla de cada hueso principal', async () => {
    const source = readFileSync(new URL('../assets/anatomy/body/bones.glb', import.meta.url));
    const { scene: model } = await new GLTFLoader().parseAsync(new Uint8Array(source).buffer, '');
    const ids = ['skull', 'humerus', 'ribs', 'pelvis', 'femur', 'tibia'];
    model.traverse(node => {
      const id = node.name.replace(/_(left|right)$/, '');
      if (node instanceof Mesh && ids.includes(id)) node.userData.term = id;
    });
    const camera = new PerspectiveCamera(45, 375/565, .1, 10);
    camera.position.set(.45, 1, 3);
    camera.lookAt(0, .8, 0);
    const arrows = projectBones(model, camera);
    expect(new Set(arrows.map(target => target.id))).toEqual(new Set(ids));
    for (const target of arrows) {
      const ray = new Raycaster();
      ray.setFromCamera(new Vector2(target.x*2 - 1, 1-target.y*2), camera);
      const bone = model.getObjectByName(target.source!)!;
      expect(ray.intersectObject(bone)[0]?.object.name, target.source).toBe(target.source);
    }
  });
});
