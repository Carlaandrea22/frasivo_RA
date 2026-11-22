import { readFileSync } from 'node:fs';
import { Box3, type Matrix4, Mesh, Triangle, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { describe, expect, it } from 'vitest';
import { estructuras } from '../src/content/anatomy/catalogo';
import { modelos } from '../src/content/anatomy/modelos';
import { anotaciones } from '../src/content/anotaciones/anatomia';
import type { Punto3D } from '../src/content/types';
import { belongsTo, createModelScene, type ModelScene } from '../src/shared/visor3d/modelScene';
import faseA from './fixtures/explorar-fase-a-ids.json';

type Surface = { triangles: number; surfaceArea: number };
type Coverage = Surface & {
  nodeId: string;
  maxTriangles: number;
  bounds: { min: Punto3D; max: Punto3D };
  regions: Record<string, Surface>;
};

const atlas: { version: number; models: Record<string, Coverage> } =
  JSON.parse(readFileSync('scripts/explorar-atlas-triangle-regions.json', 'utf8'));
const fichas = Object.entries(faseA.estructuras).map(([id, original]) => ({ id, original }));
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const axes = ['x', 'y', 'z'] as const;
const complexModels = new Set(['skull', 'spine']);

function readModel(id: string) {
  return readFileSync(`src/content/anatomy/modelos/fichas/explorar-${id}.glb`);
}

async function modelScene(bytes: Buffer, nodeId: string) {
  const { scene } = await loader.parseAsync(Uint8Array.from(bytes).buffer, '');
  const model = createModelScene(scene, nodeId);
  if (!model) throw new Error(`No se pudo aislar ${nodeId}.`);
  return model;
}

function transformError(local: readonly number[], matrix: Matrix4) {
  const { elements } = matrix;
  return new Vector3().fromArray(axes.map((_, axis) =>
    local.reduce((sum, error, i) => sum + Math.abs(elements[axis + 4 * i]) * error, 0)));
}

function worldPositionError(mesh: Mesh, bounds: Box3) {
  // gltfpack -vpf -vp 16 conserva 16 bits de precisión binaria, incluido el implícito.
  // Transformamos medio paso de cuantización de cada eje local al espacio del visor.
  const local = axes.map(axis => {
    const magnitude = Math.max(Math.abs(bounds.min[axis]), Math.abs(bounds.max[axis]));
    return 2 ** (Math.floor(Math.log2(magnitude)) - 16);
  });
  return transformError(local, mesh.matrixWorld);
}

function measureSurface(scene: ModelScene, anchors: Map<string, Vector3>) {
  const regions = new Map<string, Surface & { areaError: number; anchorDistance: number; anchorError: number }>();
  const bounds = new Box3();
  const boundsError = new Vector3();
  const faces = new Set<string>();
  const triangle = new Triangle();
  const closest = new Vector3();

  for (const mesh of scene.objects) {
    if (!(mesh instanceof Mesh)) throw new Error('Se esperaba una malla.');
    const id = scene.selectionId(mesh);
    if (!id) throw new Error(`Falta el ID de selección de la malla ${mesh.name}.`);
    const region = regions.get(id) ?? { triangles: 0, surfaceArea: 0, areaError: 0, anchorDistance: Infinity, anchorError: 0 };
    regions.set(id, region);

    const { index, attributes } = mesh.geometry;
    const localVertices = Array.from({ length: attributes.position.count }, (_, i) =>
      mesh.getVertexPosition(i, new Vector3()));
    const positionError = worldPositionError(mesh, new Box3().setFromPoints(localVertices));
    boundsError.max(positionError);
    const error = positionError.length();
    const vertices = localVertices.map(point => point.applyMatrix4(mesh.matrixWorld));
    const coordinates = vertices.map(point => point.toArray().join(','));
    const anchor = anchors.get(id);
    const count = index?.count ?? vertices.length;
    expect(count % 3, id).toBe(0);
    for (let i = 0; i < count; i += 3) {
      const a = index?.getX(i) ?? i;
      const b = index?.getX(i + 1) ?? i + 1;
      const c = index?.getX(i + 2) ?? i + 2;
      triangle.set(vertices[a], vertices[b], vertices[c]);
      bounds.expandByPoint(triangle.a).expandByPoint(triangle.b).expandByPoint(triangle.c);
      // Las costuras pueden repetir vértices con normales distintas y las caras pueden invertir el orden.
      faces.add([coordinates[a], coordinates[b], coordinates[c]].sort().join('|'));
      region.triangles++;
      region.surfaceArea += triangle.getArea();
      // Cada lado puede desviarse hasta dos veces el error de un vértice.
      region.areaError += error * (triangle.a.distanceTo(triangle.b) + triangle.a.distanceTo(triangle.c) + 2 * error);
      if (anchor) {
        const distance = triangle.closestPointToPoint(anchor, closest).distanceTo(anchor);
        region.anchorDistance = Math.min(region.anchorDistance, distance);
        region.anchorError = Math.max(region.anchorError, error);
      }
    }
  }

  return { regions, bounds, boundsError, uniqueFaces: faces.size };
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

  it.each(fichas)('conserva los IDs de la etapa A en $id', ({ id, original }) => {
    const matches = estructuras.filter(item => item.id === id);
    expect(matches).toHaveLength(1);
    const [item] = matches;
    expect(item.modelo?.nodeId).toBe(original.nodeId);
    expect(item.partes.map(part => part.id)).toEqual(expect.arrayContaining(original.partes));
    const notes = anotaciones.filter(note => note.estructuraId === id);
    expect(notes.map(note => [note.id, note.parteId, note.nodeId])).toEqual(expect.arrayContaining(original.anotaciones));
  });

  it('sirve un GLB Meshopt cuantizado distinto para cada una de las 24 fichas', () => {
    expect(fichas).toHaveLength(24);
    const urls = new Set<string>();
    for (const { id } of fichas) {
      const modelo = estructuras.find(item => item.id === id)?.modelo;
      expect(modelo, id).toBeDefined();
      const url = modelos[modelo!.assetId];
      expect(new URL(url, 'http://localhost').pathname, id).toMatch(new RegExp(`/explorar-${id}\\.glb$`));
      urls.add(url);
      const bytes = readModel(id);
      expect(bytes.length, id).toBeLessThanOrEqual(800_000);
      const data = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      expect(data.extensionsRequired, id).toEqual(expect.arrayContaining(['EXT_meshopt_compression', 'KHR_mesh_quantization']));
    }
    expect(urls.size).toBe(24);
  });

  it.each(fichas)('conserva la cobertura de la fuente de detalle y los anclajes de $id', async ({ id, original }) => {
    expect(atlas.version).toBe(2);
    const expected = atlas.models[id];
    expect(expected, id).toBeDefined();
    expect(expected.nodeId).toBe(original.nodeId);
    expect(expected.maxTriangles).toBe(complexModels.has(id) ? 60_000 : 40_000);

    const scene = await modelScene(readModel(id), original.nodeId);
    scene.root.traverse(node => {
      if (node instanceof Mesh) expect(scene.visible.has(node), node.name).toBe(true);
    });

    const item = estructuras.find(item => item.id === id)!;
    const notes = anotaciones.filter(note => note.estructuraId === id);
    expect(notes.map(note => note.parteId).sort()).toEqual(item.partes.map(part => part.id).sort());
    const anchors = new Map<string, Vector3>();
    for (const note of notes) {
      const node = scene.nodes.get(note.nodeId);
      if (!node) throw new Error(`Falta el nodo ${note.nodeId}.`);
      expect(scene.visible.has(node), note.id).toBe(true);
      expect(scene.objects.some(mesh => belongsTo(mesh, node) && scene.selectionId(mesh) === note.nodeId), note.id).toBe(true);
      expect(note.punto, note.id).toHaveLength(3);
      expect(note.punto.every(Number.isFinite), note.id).toBe(true);
      anchors.set(note.nodeId, node.localToWorld(new Vector3(...note.punto)));
    }

    const { regions, bounds, boundsError, uniqueFaces } = measureSurface(scene, anchors);
    expect([...regions.keys()].sort()).toEqual(Object.keys(expected.regions).sort());
    expect([...regions.keys()].filter(name => name !== `${expected.nodeId}__base`).sort()).toEqual([...anchors.keys()].sort());
    expect(anchors.size).toBe(notes.length);
    let triangles = 0;
    let surfaceArea = 0;
    let areaError = 0;
    for (const [name, region] of regions) {
      const source = expected.regions[name];
      expect(region.triangles, name).toBe(source.triangles);
      expect(region.triangles, name).toBeGreaterThan(0);
      expect(Math.abs(region.surfaceArea - source.surfaceArea), name).toBeLessThanOrEqual(region.areaError + 1e-9);
      if (anchors.has(name)) {
        // Los puntos JSON se redondean a siete decimales además de la cuantización de vértices.
        const roundingError = transformError([5e-8, 5e-8, 5e-8], scene.nodes.get(name)!.matrixWorld).length();
        expect(region.anchorDistance, name).toBeLessThanOrEqual(region.anchorError + roundingError);
      }
      triangles += region.triangles;
      surfaceArea += region.surfaceArea;
      areaError += region.areaError;
    }
    expect(triangles).toBe(expected.triangles);
    expect(triangles).toBeLessThanOrEqual(expected.maxTriangles);
    expect(uniqueFaces, 'triángulos sin duplicar').toBe(triangles);
    expect(Math.abs(surfaceArea - expected.surfaceArea)).toBeLessThanOrEqual(areaError + 1e-9);
    axes.forEach((axis, i) => {
      expect(Math.abs(bounds.min[axis] - expected.bounds.min[i]), `mínimo en ${axis}`).toBeLessThanOrEqual(boundsError[axis] + 1e-7);
      expect(Math.abs(bounds.max[axis] - expected.bounds.max[i]), `máximo en ${axis}`).toBeLessThanOrEqual(boundsError[axis] + 1e-7);
    });
  });
});
