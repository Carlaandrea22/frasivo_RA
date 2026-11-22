// npm exec --yes --package=gltfpack@1.3.0 -- node scripts/generate-explorar-fichas.mjs
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { readGlb, writeGlb } from './explorar-glb.mjs';

const run = promisify(execFile);
const source = process.argv[2] ?? 'assets/_fuentes/explorar-fase2/b/regiones';
const output = process.argv[3] ?? new URL('../src/content/anatomy/modelos/fichas/', import.meta.url).pathname;
const maxBytes = 800_000;

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
  const files = (await readdir(source)).filter(file => file.endsWith('.glb')).sort();
  if (!files.length) throw new Error('No se encontraron GLB con regiones en ' + source);
  for (const file of files) {
    const { data, binary } = readGlb(await readFile(join(source, file)));
    await pack(file.slice(0, -4), data, binary);
  }
  await mkdir(output, { recursive: true });
  for (const [id, bytes] of fichas) {
    await writeFile(join(output, `explorar-${id}.glb`), bytes);
    console.log(`${id}: ${bytes.length} bytes`);
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
}
