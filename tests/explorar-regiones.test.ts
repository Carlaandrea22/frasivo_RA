import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { estructuras } from '../src/content/anatomy/catalogo';
import { anotaciones } from '../src/content/anotaciones/anatomia';

function glb(path: string) {
  const bytes = readFileSync(path);
  const size = bytes.readUInt32LE(12);
  const data = JSON.parse(bytes.subarray(20,20+size).toString());
  const binary = bytes.subarray(28+size);
  const indices = (primitive: { indices: number }): number[] => {
    const a = data.accessors[primitive.indices], view = data.bufferViews[a.bufferView];
    const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
    return Array.from({ length: a.count }, (_, i) => a.componentType === 5125 ? binary.readUInt32LE(offset+i*4) : binary.readUInt16LE(offset+i*2));
  };
  return { data, indices };
}

const atlases = [
  { source: 'bones', output: 'huesos', ids: ['femur', 'tibia', 'humerus', 'radius', 'pelvis', 'patella', 'ulna', 'fibula', 'sternum', 'skull', 'spine'] },
  { source: 'muscles', output: 'musculos', ids: ['biceps_brachii', 'quadriceps_femoris', 'deltoid', 'triceps_brachii', 'gastrocnemius'] },
  { source: 'organs', output: 'pulmones', ids: ['lungs'] },
  { source: 'organs', output: 'organos', ids: ['stomach', 'kidneys', 'brain', 'liver', 'small_intestine', 'large_intestine'] },
];

describe('regiones seleccionables del atlas', () => {
  it('cada parte apunta a su propia malla y mantiene el ID de la estructura', () => {
    for (const id of ['femur','tibia','humerus','radius']) {
      const item = estructuras.find(i => i.id === id)!;
      expect(item.modelo?.assetId).toBe('body-bones-regions');
      const notes = anotaciones.filter(a => a.estructuraId === id);
      expect(new Set(notes.map(a => a.nodeId)).size).toBe(3);
      expect(notes.every(a => a.nodeId.startsWith(`${item.modelo?.nodeId}__`))).toBe(true);
    }
  });
  it.each(atlases)('separa triángulos de $output sin duplicarlos ni perder superficie', ({ source, output, ids }) => {
    const original = glb(`assets/anatomy/body/${source}.glb`);
    const regions = glb(`src/content/anatomy/modelos/${output}-regiones.glb`);
    for (const id of ids) {
      const item = estructuras.find(i => i.id === id);
      if (!item) throw new Error(`Falta la ficha ${id}`);
      const nodeId = item.modelo?.nodeId;
      const oldNode = original.data.nodes.find((n: { name: string }) => n.name === nodeId);
      const expected = original.indices(original.data.meshes[oldNode.mesh].primitives[0]);
      const parent = regions.data.nodes.find((n: { name: string }) => n.name === nodeId);
      const pieces = parent.children.map((index: number) => regions.data.nodes[index]);
      const notes = anotaciones.filter(a => a.estructuraId === id);
      expect(notes.map(n => n.parteId).sort()).toEqual(item.partes.map(p => p.id).sort());
      expect(pieces.filter((n: { name: string }) => !n.name.endsWith('__base')).map((n: { name: string }) => n.name).sort())
        .toEqual(notes.map(n => n.nodeId).sort());
      const actual: number[] = [];
      for (const piece of pieces) {
        const indices = regions.indices(regions.data.meshes[piece.mesh].primitives[0]);
        expect(indices.length).toBeGreaterThan(0);
        expect(indices.length).toBeLessThan(expected.length);
        actual.push(...indices);
      }
      const triangles = (indices: number[]) => Array.from({ length: indices.length/3 }, (_, i) => indices.slice(i*3,i*3+3).join(',')).sort();
      expect(triangles(actual)).toEqual(triangles(expected));
    }
  });
});
