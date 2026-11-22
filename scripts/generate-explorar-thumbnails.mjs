/** Reproduce: node scripts/generate-explorar-thumbnails.mjs (Chrome instalado).
 * GLB existentes, cámara frontal ortográfica, iluminación fija, WebP RGBA 256px.
 * Derivados BodyParts3D CC BY 4.0; atribución: assets/anatomy/FUENTES.md.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../src/content/anatomy/miniaturas/', import.meta.url);
const sources = process.argv[2] ?? new URL('./explorar-detail-sources.json', import.meta.url);
const { fichas } = JSON.parse(await readFile(sources, 'utf8'));
const server = await createServer({ root, server: { host: '127.0.0.1', port: 4186, strictPort: true } });
let browser;
try {
  await mkdir(output, { recursive: true });
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:4186/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Miniaturas LumAR</title>' }));
  await page.goto('http://127.0.0.1:4186');
  for (const { id, root: nodeId } of fichas) {
    const file = `/src/content/anatomy/modelos/fichas/explorar-${id}.glb`;
    const thumbnail = await page.evaluate(async ({ file, nodeId }) => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
      const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(file);
      const model = gltf.scene.getObjectByName(nodeId);
      if (!model) throw Error(`Nodo ausente: ${nodeId}`);
      const scene = new THREE.Scene();
      scene.add(model);
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const span = Math.max(size.x, size.y, size.z) * 1.22;
      const camera = new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.001,100);
      camera.position.copy(center).add(new THREE.Vector3(0,0,span*3));
      camera.lookAt(center);
      const key = new THREE.DirectionalLight(0xfff3e3,2.15); key.position.set(1,3,4);
      const fill = new THREE.DirectionalLight(0xe3efff,.65); fill.position.set(-2,1,-3);
      scene.add(new THREE.HemisphereLight(0xfff5e6,0xbacdc7,1.7),key,fill);
      const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, preserveDrawingBuffer:true });
      renderer.setSize(256,256); renderer.setClearColor(0,0); renderer.render(scene,camera);
      const data = renderer.domElement.toDataURL('image/webp', .92).split(',')[1];
      renderer.dispose(); renderer.forceContextLoss();
      return data;
    }, { file, nodeId });
    const name = id === 'heart' ? 'heart-cutaway' : nodeId;
    await writeFile(new URL(`${name}.webp`, output), Buffer.from(thumbnail, 'base64'));
    console.log(`256px RGBA: ${name}`);
  }
} finally { await browser?.close(); await server.close(); }
