/** Partition the prepared Blender GLBs by their region material slots.
 * Derivatives of BodyParts3D © DBCLS, CC BY 4.0.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Box3, Triangle, Vector3 } from 'three';
import { readGlb, writeGlb } from './explorar-glb.mjs';

const repo = new URL('../', import.meta.url);
const work = 'assets/_fuentes/explorar-fase2/b';
const args = process.argv.slice(2);
const projectMetadata = args.includes('--write-project-metadata');
const [manifestPath, prepared = join(work, 'preparados'), output = join(work, 'regiones')] = args.filter(arg => arg !== '--write-project-metadata');
if (!manifestPath) throw new Error('Indica el manifiesto de fuentes y, si corresponde, las carpetas de GLB.');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const models = {};
const points = {};
const posterior = new Set(['cara_articular', 'occipital', 'cerebelo', 'caudado']);
await mkdir(output, { recursive: true });

for (const model of manifest.fichas) {
  const { id, root } = model;
  const original = await readFile(join(prepared, id + '.glb'));
  const { data, binary } = readGlb(original);
  const regions = new Map();
  for (const node of data.nodes) {
    if (node.mesh === undefined) continue;
    if (node.matrix || node.translation || node.rotation || node.scale || node.children) {
      throw new Error(id + ': el GLB preparado debe tener transformaciones aplicadas.');
    }
    for (const primitive of data.meshes[node.mesh].primitives) {
      const part = data.materials[primitive.material]?.extras?.atlasPart;
      if (!part || primitive.attributes.COLOR_0 === undefined || primitive.attributes.NORMAL === undefined) {
        throw new Error(id + ': faltan asignación de región, normales o COLOR_0.');
      }
      if (!regions.has(part)) regions.set(part, []);
      regions.get(part).push(primitive);
    }
  }
  const expected = new Set(model.parts.map(part => part.id).filter(part => part !== 'base'));
  const found = new Set([...regions.keys()].filter(part => part !== 'base'));
  if (found.size !== expected.size || [...expected].some(part => !found.has(part))) {
    throw new Error(id + ': regiones esperadas ' + [...expected] + ', obtenidas ' + [...found]);
  }

  const rootNode = { name: root, extras: { nodeId: root }, children: [] };
  const nodes = [rootNode];
  const meshes = [];
  const bounds = new Box3();
  const measured = {};
  const total = { triangles: 0, surfaceArea: 0 };
  for (const [part, primitives] of regions) {
    const name = model.retainedAsset ? part : `${root}__${part}`;
    const coverage = measure(primitives, data, binary, posterior.has(part));
    bounds.union(coverage.box);
    measured[name] = { triangles: coverage.triangles, surfaceArea: coverage.surfaceArea };
    total.triangles += coverage.triangles;
    total.surfaceArea += coverage.surfaceArea;
    if (part !== 'base' && !model.retainedAsset) points[name] = coverage.point.map(value => Number(value.toFixed(7)));
    rootNode.children.push(nodes.length);
    nodes.push({ name, mesh: meshes.length, extras: { nodeId: name, revision: 'provisional' } });
    meshes.push({ name, primitives });
  }
  const maxTriangles = model.maxTriangles ?? (['skull', 'spine', 'ribs', 'hand', 'foot'].includes(id) ? 60_000 : 40_000);
  if (total.triangles > maxTriangles) throw new Error(id + ': supera el límite de triángulos.');
  const asset = { ...data.asset, generator: 'Blender y LumAR' };
  if (!model.retainedAsset) asset.copyright = 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
  const result = { ...data, asset, scene: 0, scenes: [{ name: 'Explorar 3D', nodes: [0] }], nodes, meshes };
  await writeFile(join(output, id + '.glb'), writeGlb(result, binary));
  models[id] = {
    nodeId: root, maxTriangles, ...total,
    sourceSha256: createHash('sha256').update(original).digest('hex'),
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    regions: measured,
  };
  console.log(id, total.triangles, Object.fromEntries(Object.entries(measured).map(([name, stats]) => [name, stats.triangles])));
}

await writeFile(join(output, 'mapa.json'), JSON.stringify({ version: 2, models }, null, 2) + '\n');
await writeFile(join(output, 'puntos-regiones.json'), JSON.stringify(points, null, 2) + '\n');
if (projectMetadata) {
  await writeFile(new URL('scripts/explorar-atlas-triangle-regions.json', repo), JSON.stringify({ version: 2, models }, null, 2) + '\n');
  await writeFile(new URL('src/content/anotaciones/puntos-regiones.json', repo), JSON.stringify(points, null, 2) + '\n');
}

function measure(primitives, data, binary, back) {
  const box = new Box3();
  const candidates = [];
  const triangle = new Triangle();
  let surfaceArea = 0;
  for (const { attributes, indices } of primitives) {
    const position = access(data, binary, attributes.POSITION);
    const index = access(data, binary, indices);
    const points = Array.from({ length: data.accessors[attributes.POSITION].count }, (_, i) =>
      new Vector3(position(i, 0), position(i, 1), position(i, 2)));
    for (let i = 0; i < data.accessors[indices].count; i += 3) {
      const a = points[index(i)], b = points[index(i + 1)], c = points[index(i + 2)];
      box.expandByPoint(a).expandByPoint(b).expandByPoint(c);
      triangle.set(a, b, c);
      surfaceArea += triangle.getArea();
      candidates.push(triangle.getMidpoint(new Vector3()));
    }
  }
  if (!candidates.length) throw new Error('Región sin triángulos.');
  const target = box.getCenter(new Vector3());
  target.z = back ? box.min.z : box.max.z;
  let point = candidates[0];
  for (const center of candidates) if (center.distanceToSquared(target) < point.distanceToSquared(target)) point = center;
  return { box, triangles: candidates.length, surfaceArea, point: point.toArray() };
}

function access(data, binary, accessor) {
  const { bufferView, byteOffset = 0, type, componentType } = data.accessors[accessor];
  const view = data.bufferViews[bufferView];
  const readers = { 5126: ['readFloatLE', 4], 5125: ['readUInt32LE', 4], 5123: ['readUInt16LE', 2], 5121: ['readUInt8', 1] };
  const [reader, size] = readers[componentType];
  const stride = view.byteStride ?? size * (type === 'VEC3' ? 3 : 1);
  const start = (view.byteOffset ?? 0) + byteOffset;
  return (index, component = 0) => binary[reader](start + index * stride + component * size);
}
