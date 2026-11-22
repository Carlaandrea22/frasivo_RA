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

describe('regiones seleccionables de los huesos', () => {
  it('cada parte apunta a su propia malla y mantiene el ID de la estructura', () => {
    for (const id of ['femur','tibia','humerus','radius']) {
      const item = estructuras.find(i => i.id === id)!;
      expect(item.modelo?.assetId).toBe('body-bones-regions');
      const notes = anotaciones.filter(a => a.estructuraId === id);
      expect(new Set(notes.map(a => a.nodeId)).size).toBe(3);
      expect(notes.every(a => a.nodeId.startsWith(`${item.modelo?.nodeId}__`))).toBe(true);
    }
  });
  it('separa triángulos sin duplicarlos ni perder superficie del hueso original', () => {
    const original = glb('assets/anatomy/body/bones.glb');
    const regions = glb('src/content/anatomy/modelos/huesos-regiones.glb');
    for (const id of ['femur_left','tibia_left','humerus_left','radius_left']) {
      const oldNode = original.data.nodes.find((n: { name: string }) => n.name === id);
      const expected = original.indices(original.data.meshes[oldNode.mesh].primitives[0]);
      const parent = regions.data.nodes.find((n: { name: string }) => n.name === id);
      const pieces = parent.children.map((index: number) => regions.data.nodes[index]);
      expect(pieces.filter((n: { name: string }) => !n.name.endsWith('__base'))).toHaveLength(3);
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
