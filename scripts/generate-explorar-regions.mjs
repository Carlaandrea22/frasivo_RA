/** node scripts/generate-explorar-regions.mjs
 * Derivado de BodyParts3D CC BY 4.0. Véase assets/anatomy/FUENTES.md.
 * Divide los triángulos existentes; conserva posiciones, normales y materiales.
 * Máscaras geométricas orientativas, pendientes de revisión anatómica.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const source = await readFile(new URL('../assets/anatomy/body/bones.glb', import.meta.url));
const jsonLength = source.readUInt32LE(12);
const original = JSON.parse(source.subarray(20,20+jsonLength).toString());
const binary = source.subarray(28+jsonLength);
const definitions = {
  femur_left: { cabeza: ([x,y]) => x < .105 && y > .798, condilos: ([,y]) => y < .421, cuerpo: ([,y]) => y > .445 && y < .765 },
  tibia_left: { condilos: ([,y]) => y > .337, maleolo: ([x,y]) => x < .066 && y < .041, cuerpo: ([,y]) => y > .06 && y < .32 },
  humerus_left: { cabeza: ([x,y]) => x < .185 && y > 1.301, troclea: ([x,y]) => x < .218 && y < 1.068, cuerpo: ([,y]) => y > 1.09 && y < 1.285 },
  radius_left: { cabeza: ([,y]) => y > 1.014, estiloides: ([x,y]) => x > .26 && y < .849, cuerpo: ([,y]) => y > .865 && y < 1.002 },
};
const result = {
  asset: { version: '2.0', generator: 'LumAR · generate-explorar-regions.mjs', copyright: 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International' },
  scene: 0, scenes: [{ name: 'Explorar: regiones provisionales', nodes: [] }],
  nodes: [], meshes: [], materials: original.materials, accessors: [], bufferViews: [], buffers: [],
  extras: { revision: 'provisional', segmentation: 'Máscaras geométricas orientativas, sin validación anatómica. Se conserva cada triángulo original una vez.' },
};
const chunks = [], views = new Map(), accessors = new Map();
let byteLength = 0;
function append(data, options = {}) {
  const padding = (4-byteLength%4)%4;
  if (padding) { chunks.push(Buffer.alloc(padding)); byteLength += padding; }
  const index = result.bufferViews.length;
  result.bufferViews.push({ ...options, buffer: 0, byteOffset: byteLength, byteLength: data.length });
  chunks.push(data); byteLength += data.length;
  return index;
}
function copyAccessor(id) {
  if (accessors.has(id)) return accessors.get(id);
  const a = original.accessors[id];
  if (a.sparse) throw Error('No se admiten atributos sparse en esta fuente.');
  if (!views.has(a.bufferView)) {
    const view = original.bufferViews[a.bufferView];
    views.set(a.bufferView, append(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0)+view.byteLength), view));
  }
  const next = result.accessors.length;
  result.accessors.push({ ...a, bufferView: views.get(a.bufferView) });
  accessors.set(id,next); return next;
}
function readAccessor(id, index, component = 0) {
  const a = original.accessors[id], view = original.bufferViews[a.bufferView];
  const bytes = a.componentType === 5123 ? 2 : 4;
  const stride = view.byteStride ?? bytes*(a.type === 'VEC3' ? 3 : 1);
  const offset = (view.byteOffset ?? 0)+(a.byteOffset ?? 0)+index*stride+component*bytes;
  if (a.componentType === 5126) return binary.readFloatLE(offset);
  if (a.componentType === 5125) return binary.readUInt32LE(offset);
  if (a.componentType === 5123) return binary.readUInt16LE(offset);
  throw Error(`Tipo no compatible: ${a.componentType}`);
}
for (const [nodeId, masks] of Object.entries(definitions)) {
  const node = original.nodes.find(n => n.name === nodeId);
  const primitives = original.meshes[node.mesh].primitives;
  if (primitives.length !== 1) throw Error('La fuente cambió: se esperaba una primitiva por hueso.');
  const primitive = primitives[0];
  const regions = Object.fromEntries([...Object.keys(masks),'base'].map(id => [id,[]]));
  const count = original.accessors[primitive.indices].count;
  for (let i = 0; i < count; i += 3) {
    const triangle = [0,1,2].map(k => readAccessor(primitive.indices,i+k));
    const center = [0,1,2].map(axis => triangle.reduce((sum,vertex) => sum+readAccessor(primitive.attributes.POSITION,vertex,axis),0)/3);
    const region = Object.entries(masks).find(([,mask]) => mask(center))?.[0] ?? 'base';
    regions[region].push(...triangle);
  }
  const parentIndex = result.nodes.length;
  const parent = { ...node, children: [] };
  delete parent.mesh;
  result.nodes.push(parent); result.scenes[0].nodes.push(parentIndex);
  const attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([key,id]) => [key,copyAccessor(id)]));
  for (const [part,indices] of Object.entries(regions)) {
    if (!indices.length) throw Error(`Región vacía: ${nodeId}/${part}`);
    const buffer = Buffer.alloc(indices.length*4);
    indices.forEach((value,i) => buffer.writeUInt32LE(value,i*4));
    const accessor = result.accessors.length;
    result.accessors.push({ bufferView: append(buffer,{ target: 34963 }), componentType: 5125, count: indices.length, type: 'SCALAR' });
    const mesh = result.meshes.length;
    result.meshes.push({ name: `${nodeId}__${part}`, primitives: [{ ...primitive, attributes, indices: accessor }] });
    parent.children.push(result.nodes.length);
    result.nodes.push({ name: `${nodeId}__${part}`, mesh, extras: { nodeId: `${nodeId}__${part}`, revision: 'provisional' } });
    console.log(`${nodeId}/${part}: ${indices.length/3} triángulos`);
  }
}
result.buffers.push({ byteLength });
let json = Buffer.from(JSON.stringify(result));
json = Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);
let bin = Buffer.concat(chunks);
bin = Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0); header.writeUInt32LE(2,4); header.writeUInt32LE(28+json.length+bin.length,8);
header.writeUInt32LE(json.length,12); header.writeUInt32LE(0x4e4f534a,16);
binHeader.writeUInt32LE(bin.length,0); binHeader.writeUInt32LE(0x004e4942,4);
const output = new URL('../src/content/anatomy/modelos/', import.meta.url);
await mkdir(output,{ recursive:true });
await writeFile(new URL('huesos-regiones.glb',output),Buffer.concat([header,json,binHeader,bin]));
