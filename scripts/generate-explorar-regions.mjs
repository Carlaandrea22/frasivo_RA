/** node scripts/generate-explorar-regions.mjs
 * Derivado de BodyParts3D CC BY 4.0. Véase assets/anatomy/FUENTES.md.
 * Divide los triángulos existentes; conserva posiciones, normales y materiales.
 * Máscaras geométricas orientativas, pendientes de revisión anatómica.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const boneMasks = {
  femur_left: { cabeza: ([x,y]) => x < .105 && y > .798, condilos: ([,y]) => y < .421, cuerpo: ([,y]) => y > .445 && y < .765 },
  tibia_left: { condilos: ([,y]) => y > .337, maleolo: ([x,y]) => x < .066 && y < .041, cuerpo: ([,y]) => y > .06 && y < .32 },
  humerus_left: { cabeza: ([x,y]) => x < .185 && y > 1.301, troclea: ([x,y]) => x < .218 && y < 1.068, cuerpo: ([,y]) => y > 1.09 && y < 1.285 },
  radius_left: { cabeza: ([,y]) => y > 1.014, estiloides: ([x,y]) => x > .26 && y < .849, cuerpo: ([,y]) => y > .865 && y < 1.002 },
  pelvis_left: {
    acetabulo: ([x,y,z]) => Math.hypot((x-.109)/.022,(y-.835)/.023,(z-.082)/.026) < 1,
    ilion: ([,y]) => y > .851,
    pubis: ([,y,z]) => y < .854 && z > .095,
    isquion: ([,y,z]) => y < .831 && z < .093,
  },
  patella_left: {
    base_superior: ([,y]) => y > .398,
    vertice: ([,y]) => y < .377,
    cara_articular: ([,y,z]) => y > .38 && z < .110,
  },
};

// Group the disconnected surfaces already present in the mesh. Blender may
// export a vertex twice if its normal differs, so weld by position for this lookup.
function byComponent(positions, triangles, names, split) {
  const parents = positions.map((_, i) => i);
  const root = i => {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i]; }
    return i;
  };
  const join = (a,b) => { parents[root(b)] = root(a); };
  const positionIds = new Map();
  positions.forEach((point,i) => {
    const key = point.join(',');
    if (positionIds.has(key)) join(positionIds.get(key),i);
    else positionIds.set(key,i);
  });
  for (const [a,b,c] of triangles) { join(a,b); join(a,c); }
  const counts = new Map();
  for (const [a] of triangles) {
    const id = root(a);
    counts.set(id,(counts.get(id) ?? 0)+1);
  }
  const components = [...counts].sort((a,b) => b[1]-a[1]);
  const named = new Map(names.map((name,i) => {
    if (!components[i] || components[i][1] < 100) throw Error(`Componente anatómico ausente: ${name}`);
    return [components[i][0],name];
  }));
  return (center,triangle) => {
    const name = named.get(root(triangle[0])) ?? 'base';
    return split ? split(name,center) : name;
  };
}

const generatedPoints = {};
const output = new URL('../src/content/anatomy/modelos/', import.meta.url);
await mkdir(output,{ recursive:true });
await generate('bones', 'huesos-regiones.glb', Object.fromEntries(Object.entries(boneMasks).map(([id,masks]) => [id, () => center => Object.entries(masks).find(([,mask]) => mask(center))?.[0] ?? 'base'])));
await generate('muscles', 'musculos-regiones.glb', {
  biceps_brachii_left: (points,triangles) => byComponent(points,triangles,['cabeza_corta','cabeza_larga']),
  quadriceps_femoris_left: (points,triangles) => byComponent(points,triangles,['vasto_lateral','recto_femoral','vasto_medial','vasto_intermedio']),
});
await generate('organs', 'pulmones-regiones.glb', {
  lungs: (points,triangles) => byComponent(points,triangles,['inferior_derecho','superior_derecho','inferior_izquierdo','superior_izquierdo'],
    (name,[,y,z]) => name === 'superior_derecho' && y < 1.259 && z > .115 ? 'medio_derecho' : name),
});
await writeFile(new URL('../src/content/anotaciones/puntos-regiones.json',import.meta.url),JSON.stringify(generatedPoints,null,2)+'\n');

async function generate(sourceName, fileName, definitions) {
  const source = await readFile(new URL(`../assets/anatomy/body/${sourceName}.glb`, import.meta.url));
  const jsonLength = source.readUInt32LE(12);
  const original = JSON.parse(source.subarray(20,20+jsonLength).toString());
  const binary = source.subarray(28+jsonLength);
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
  for (const [nodeId, classifier] of Object.entries(definitions)) {
    const node = original.nodes.find(n => n.name === nodeId);
    const primitives = original.meshes[node.mesh].primitives;
    if (primitives.length !== 1) throw Error('La fuente cambió: se esperaba una primitiva por hueso.');
    const primitive = primitives[0];
    const regions = new Map();
    const count = original.accessors[primitive.indices].count;
    const positionId = primitive.attributes.POSITION;
    const positions = Array.from({ length: original.accessors[positionId].count }, (_,i) => [0,1,2].map(k => readAccessor(positionId,i,k)));
    const triangles = Array.from({ length: count/3 }, (_,i) => [0,1,2].map(k => readAccessor(primitive.indices,i*3+k)));
    const classify = classifier(positions,triangles);
    for (const triangle of triangles) {
      const center = [0,1,2].map(axis => triangle.reduce((sum,vertex) => sum+positions[vertex][axis],0)/3);
      const region = classify(center,triangle);
      if (!regions.has(region)) regions.set(region,{ indices: [], centers: [] });
      regions.get(region).indices.push(...triangle);
      regions.get(region).centers.push(center);
    }
    const parentIndex = result.nodes.length;
    const parent = { ...node, children: [] };
    delete parent.mesh;
    result.nodes.push(parent); result.scenes[0].nodes.push(parentIndex);
    const attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([key,id]) => [key,copyAccessor(id)]));
    for (const [part,{ indices, centers }] of regions) {
      const name = `${nodeId}__${part}`;
      if (part !== 'base') {
        const middle = [0,1,2].map(axis => centers.reduce((sum,p) => sum+p[axis],0)/centers.length);
        const back = part === 'cara_articular';
        const front = centers.reduce((z,p) => back ? Math.min(z,p[2]) : Math.max(z,p[2]),middle[2]);
        const distance = ([x,y,z]) => (x-middle[0])**2+(y-middle[1])**2+(z-front)**2;
        const point = centers.reduce((best,p) => distance(p) < distance(best) ? p : best,centers[0]);
        generatedPoints[name] = point.map(v => Number(v.toFixed(7)));
      }
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
  await writeFile(new URL(fileName,output),Buffer.concat([header,json,binHeader,bin]));
}
