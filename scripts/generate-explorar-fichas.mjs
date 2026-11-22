// npm exec --yes --package=gltfpack@1.3.0 -- node scripts/generate-explorar-fichas.mjs
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const models = new URL('../src/content/anatomy/modelos/', import.meta.url);
const output = new URL('fichas/', models);
const maxBytes = 800_000;
const atlases = ['huesos-regiones.glb', 'musculos-regiones.glb', 'pulmones-regiones.glb', 'organos-regiones.glb'];

function readGlb(bytes) {
  const length = bytes.readUInt32LE(12);
  return { data: JSON.parse(bytes.toString('utf8', 20, 20 + length)), binary: bytes.subarray(28 + length) };
}

function writeGlb(data, binary) {
  const json = Buffer.from(JSON.stringify(data));
  const padding = Buffer.alloc((4 - json.length % 4) % 4, 0x20);
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + padding.length + binary.length, 8);
  header.writeUInt32LE(json.length + padding.length, 12);
  header.write('JSON', 16);
  const chunk = Buffer.alloc(8);
  chunk.writeUInt32LE(binary.length, 0);
  chunk.write('BIN', 4);
  return Buffer.concat([header, json, padding, chunk, binary]);
}

function isolate(data, root) {
  const nodes = [];
  function copy(index) {
    const node = { ...data.nodes[index] };
    const next = nodes.push(node) - 1;
    if (node.children) node.children = node.children.map(copy);
    return next;
  }
  // gltfpack discards the mesh/accessor data left unreferenced by this subtree.
  const scene = { ...data.scenes[data.scene], nodes: [copy(root)] };
  return { ...data, scene: 0, scenes: [scene], nodes };
}

const { stdout } = await run('gltfpack', ['-v']);
if (stdout.trim() !== 'gltfpack 1.3') throw new Error(`Se requiere gltfpack 1.3.0 (${stdout.trim()}).`);
const tmp = await mkdtemp(join(tmpdir(), 'lumar-explorar-'));
const input = join(tmp, 'source.glb');
const packed = join(tmp, 'packed.glb');
const fichas = new Map();

async function pack(id, data, binary) {
  if (fichas.has(id)) throw new Error(`Ficha repetida: ${id}.`);
  await writeFile(input, writeGlb(data, binary));
  // Floating-point quantization preserves the named nodes' local coordinate systems for annotations.
  await run('gltfpack', ['-i', input, '-o', packed, '-cc', '-ce', 'ext', '-vpf', '-vp', '16', '-vn', '12', '-kn', '-ke', '-km', '-kv']);
  const compressed = readGlb(await readFile(packed));
  if (data.asset.copyright) compressed.data.asset.copyright = data.asset.copyright;
  const bytes = writeGlb(compressed.data, compressed.binary);
  if (bytes.length > maxBytes) throw new Error(`${id}: ${bytes.length} bytes supera el límite de ${maxBytes}.`);
  fichas.set(id, bytes);
}

try {
  for (const atlas of atlases) {
    const { data, binary } = readGlb(await readFile(new URL(atlas, models)));
    for (const root of data.scenes[data.scene].nodes) {
      const id = data.nodes[root].name.replace(/_left$/, '');
      await pack(id, isolate(data, root), binary);
    }
  }
  const heart = readGlb(await readFile(new URL('../assets/anatomy/cardiovascular/heart-cutaway.glb', import.meta.url)));
  await pack('heart', heart.data, heart.binary);
  await mkdir(output, { recursive: true });
  for (const [id, bytes] of fichas) {
    await writeFile(new URL(`explorar-${id}.glb`, output), bytes);
    console.log(`${id}: ${bytes.length} bytes`);
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
}
