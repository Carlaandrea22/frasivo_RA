/** node scripts/generate-explorar-vertebrae.mjs <directorio con FJ3176.obj y FJ3177.obj> */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Mesh, MeshStandardMaterial, Scene } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const [, , directory] = process.argv;
if (!directory) throw Error('Indica el directorio con FJ3176.obj y FJ3177.obj de BodyParts3D 4.0.');

globalThis.FileReader ??= class {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }
};

const body = JSON.parse(await readFile(new URL('../assets/anatomy/body/anchors.json', import.meta.url), 'utf8'));
const heightOffset = body.anchors.thorax_center[1] - 1.225;
const loader = new OBJLoader();
const scene = new Scene();
const material = new MeshStandardMaterial();

for (const [name, element] of [['atlas', 'FJ3176'], ['axis', 'FJ3177']]) {
  const group = loader.parse(await readFile(resolve(directory, `${element}.obj`), 'utf8'));
  const [source] = group.children;
  if (group.children.length !== 1 || !source.isMesh) throw Error(`Malla inesperada para ${element}.`);
  source.geometry.deleteAttribute('normal');
  const geometry = mergeVertices(source.geometry, .001);
  geometry.rotateX(-Math.PI / 2).scale(.001, .001, .001).translate(0, heightOffset, 0);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  mesh.name = name;
  mesh.userData = { bodyparts3dElement: element };
  scene.add(mesh);
}

const exporter = new GLTFExporter();
exporter.register(writer => ({
  afterParse() {
    writer.json.asset.copyright = 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International';
  },
}));
const file = await exporter.parseAsync(scene, { binary: true });
await writeFile(new URL('../src/content/anatomy/modelos/vertebras-adicionales.glb', import.meta.url), Buffer.from(file));
