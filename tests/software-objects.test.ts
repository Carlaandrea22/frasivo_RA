import { describe, expect, it, vi } from 'vitest';
import { Box3, Mesh } from 'three';
import { softwareTerms } from '../src/objects/catalog';
import { createSoftwareScene, disposeSoftwareScene } from '../src/objects/scenes';

describe('representaciones educativas de software', () => {
  it('ofrece diez términos únicos con explicación de la metáfora y ejemplo bilingüe', () => {
    expect(softwareTerms.map(t => t.id)).toEqual(['array', 'stack', 'queue', 'thread', 'repository', 'deployment', 'framework', 'middleware', 'inheritance', 'dependency']);
    for (const term of softwareTerms) {
      for (const field of ['en', 'es', 'phonetic', 'meaning', 'example', 'translation', 'metaphor'] as const) expect(term[field].trim().length).toBeGreaterThan(0);
    }
  });
  it('produce diez objetos 3D finitos y distintos, encuadrados en el visor', () => {
    const shapes: string[] = [];
    for (const term of softwareTerms) {
      const scene = createSoftwareScene(term.id);
      const box = new Box3().setFromObject(scene);
      expect(box.isEmpty()).toBe(false);
      expect([...box.min, ...box.max].every(Number.isFinite)).toBe(true);
      expect(Math.max(...box.max.toArray().map(Math.abs), ...box.min.toArray().map(Math.abs))).toBeLessThan(3);
      const meshes: string[] = [];
      scene.traverse(node => { if (node instanceof Mesh) meshes.push(JSON.stringify([node.geometry.type, node.position.toArray(), node.scale.toArray()])); });
      expect(meshes.length).toBeGreaterThan(2);
      shapes.push(meshes.join('|'));
      disposeSoftwareScene(scene);
    }
    expect(new Set(shapes).size).toBe(10);
  });
  it('libera geometrías y materiales de una escena al abandonarla', () => {
    const scene = createSoftwareScene('inheritance');
    const disposals: ReturnType<typeof vi.spyOn>[] = [];
    scene.traverse(node => { if (node instanceof Mesh) {
      disposals.push(vi.spyOn(node.geometry, 'dispose'));
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) disposals.push(vi.spyOn(material, 'dispose'));
    } });
    disposeSoftwareScene(scene);
    expect(disposals.length).toBeGreaterThan(0);
    for (const spy of disposals) expect(spy).toHaveBeenCalled();
  });
});
