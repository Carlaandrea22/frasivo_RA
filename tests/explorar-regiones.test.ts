import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { describe, expect, it } from 'vitest';
import { estructuras } from '../src/content/anatomy/catalogo';
import { modelos } from '../src/content/anatomy/modelos';
import { anotaciones } from '../src/content/anotaciones/anatomia';
import { createModelScene } from '../src/shared/visor3d/modelScene';
import baseline from './fixtures/explorar-atlas-source.json';

const digest = (text: string) => createHash('sha256').update(text).digest('hex');

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

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

async function modelScene(bytes: Buffer, nodeId: string) {
  const { scene } = await loader.parseAsync(Uint8Array.from(bytes).buffer, '');
  const model = createModelScene(scene, nodeId);
  if (!model) throw new Error(`No se pudo aislar ${nodeId}.`);
  return model;
}

function indicesByPart(scene: Awaited<ReturnType<typeof modelScene>>) {
  const counts = new Map<string | null, number>();
  for (const object of scene.objects) {
    if (!(object instanceof Mesh)) throw new Error('Se esperaba una malla.');
    const id = scene.selectionId(object);
    const count = object.geometry.index?.count ?? object.geometry.attributes.position.count;
    counts.set(id, (counts.get(id) ?? 0) + count);
  }
  return counts;
}

describe('regiones seleccionables del atlas', () => {
  it('registra las cuatro piezas óseas agregadas con un anclaje cada una', () => {
    for (const [estructuraId, parteId] of [['skull', 'mandibula'], ['spine', 'atlas'], ['spine', 'axis'], ['spine', 'coccix']]) {
      expect(estructuras.find(item => item.id === estructuraId)?.partes.some(parte => parte.id === parteId), parteId).toBe(true);
      expect(anotaciones.filter(note => note.estructuraId === estructuraId && note.parteId === parteId)).toHaveLength(1);
    }
  });
  it('cada parte apunta a su propia malla y mantiene el ID de la estructura', () => {
    for (const id of ['femur','tibia','humerus','radius']) {
      const item = estructuras.find(i => i.id === id)!;
      const notes = anotaciones.filter(a => a.estructuraId === id);
      expect(new Set(notes.map(a => a.nodeId)).size).toBe(3);
      expect(notes.every(a => a.nodeId.startsWith(`${item.modelo?.nodeId}__`))).toBe(true);
    }
  });
  it('sirve un GLB Meshopt cuantizado distinto para cada una de las 24 fichas', () => {
    expect(estructuras).toHaveLength(24);
    const urls = new Set<string>();
    for (const { id, modelo } of estructuras) {
      expect(modelo, id).toBeDefined();
      const url = modelos[modelo!.assetId];
      expect(new URL(url, 'http://localhost').pathname, id).toMatch(new RegExp(`/explorar-${id}\\.glb$`));
      urls.add(url);
      const bytes = readFileSync(`src/content/anatomy/modelos/fichas/explorar-${id}.glb`);
      expect(bytes.length, id).toBeLessThanOrEqual(800_000);
      const data = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      expect(data.extensionsRequired, id).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']));
    }
    expect(urls.size).toBe(24);
  });
  it.each(estructuras)('conserva los triángulos por parte y los anclajes de $id', async ({ id, modelo }) => {
    const atlas = atlases.find(({ ids }) => ids.includes(id));
    const source = atlas ? `src/content/anatomy/modelos/${atlas.output}-regiones.glb` : 'assets/anatomy/cardiovascular/heart-cutaway.glb';
    const [original, compressed] = await Promise.all([
      modelScene(readFileSync(source), modelo!.nodeId),
      modelScene(readFileSync(`src/content/anatomy/modelos/fichas/explorar-${id}.glb`), modelo!.nodeId),
    ]);
    compressed.root.traverse(node => {
      if (node instanceof Mesh) expect(compressed.visible.has(node), node.name).toBe(true);
    });
    expect(indicesByPart(compressed)).toEqual(indicesByPart(original));
    expect(compressed.bounds.min.distanceTo(original.bounds.min)).toBeLessThan(0.0001);
    expect(compressed.bounds.max.distanceTo(original.bounds.max)).toBeLessThan(0.0001);
    for (const note of anotaciones.filter(note => note.estructuraId === id)) {
      const oldNode = original.nodes.get(note.nodeId);
      const newNode = compressed.nodes.get(note.nodeId);
      if (!oldNode || !newNode) throw new Error(`Falta el nodo ${note.nodeId}.`);
      expect(compressed.visible.has(newNode)).toBe(true);
      const point = new Vector3(...note.punto);
      expect(newNode.localToWorld(point.clone()).distanceTo(oldNode.localToWorld(point))).toBeLessThan(0.000001);
    }
  });
  it.each(atlases)('separa triángulos de $output sin duplicarlos ni perder superficie', ({ source, output, ids }) => {
    const regions = glb(`src/content/anatomy/modelos/${output}-regiones.glb`);
    const additions: Record<string, { asset: ReturnType<typeof glb>; nodeName: string }> = {};
    if (source === 'bones') {
      const vertebrae = glb('src/content/anatomy/modelos/vertebras-adicionales.glb');
      additions.spine__atlas = { asset: vertebrae, nodeName: 'atlas' };
      additions.spine__axis = { asset: vertebrae, nodeName: 'axis' };
    }
    for (const id of ids) {
      const item = estructuras.find(i => i.id === id);
      if (!item) throw new Error(`Falta la ficha ${id}`);
      const nodeId = item.modelo?.nodeId;
      // Explorar's GLBs were derived from the pinned atlas before Cuerpo updated its models.
      const { indexCount, sha256 } = baseline.triangles[nodeId as keyof typeof baseline.triangles];
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
        if (piece.name === 'skull__mandibula') {
          expect(digest(indices.join(','))).toBe(baseline.mandibleIndices);
          continue;
        }
        const addition = additions[piece.name];
        if (addition) {
          const sourceNode = addition.asset.data.nodes.find((n: { name: string }) => n.name === addition.nodeName);
          expect(indices).toEqual(addition.asset.indices(addition.asset.data.meshes[sourceNode.mesh].primitives[0]));
          continue;
        }
        expect(indices.length).toBeLessThan(indexCount);
        actual.push(...indices);
      }
      const triangles = (indices: number[]) => Array.from({ length: indices.length/3 }, (_, i) => indices.slice(i*3,i*3+3).join(',')).sort();
      expect(actual).toHaveLength(indexCount);
      expect(digest(triangles(actual).join('\n'))).toBe(sha256);
    }
  });
});
