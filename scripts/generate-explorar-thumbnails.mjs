/** Reproduce: node scripts/generate-explorar-thumbnails.mjs (Chrome instalado).
 * GLB existentes, cámara frontal ortográfica, iluminación fija, WebP RGBA 256px.
 * Derivados BodyParts3D CC BY 4.0; atribución: assets/anatomy/FUENTES.md.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../src/content/anatomy/miniaturas/', import.meta.url);
const targets = [
  ['body/bones', ['femur_left','tibia_left','humerus_left','radius_left','pelvis_left','patella_left','ulna_left','fibula_left','sternum','skull','spine']],
  ['body/muscles', ['biceps_brachii_left','quadriceps_femoris_left','deltoid_left','triceps_brachii_left','gastrocnemius_left']],
  ['body/organs', ['lungs','stomach','kidneys','brain','liver','small_intestine','large_intestine']],
  ['cardiovascular/heart-cutaway', [null]],
];
const server = await createServer({ root, server: { host: '127.0.0.1', port: 4186, strictPort: true } });
let browser;
try {
  await mkdir(output, { recursive: true });
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.route('http://127.0.0.1:4186/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Miniaturas LumAR</title>' }));
  await page.goto('http://127.0.0.1:4186');
  const heartPoints = {};
  for (const [file, nodes] of targets) for (const nodeId of nodes) {
    const result = await page.evaluate(async ({ file, nodeId }) => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new GLTFLoader().loadAsync(`/assets/anatomy/${file}.glb`);
      const model = nodeId ? gltf.scene.getObjectByName(nodeId) : gltf.scene;
      if (!model) throw Error(`Nodo ausente: ${nodeId}`);
      const points = {};
      model.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry.computeBoundingBox();
        const box = obj.geometry.boundingBox;
        const center = box.getCenter(new THREE.Vector3());
        // Punto de la superficie anterior más próximo al centro de la pieza.
        const vertices = obj.geometry.attributes.position;
        let distance = Infinity, point;
        for (let i = 0; i < vertices.count; i++) {
          const v = new THREE.Vector3().fromBufferAttribute(vertices,i);
          const d = (v.x-center.x)**2 + (v.y-center.y)**2 + (v.z-box.max.z)**2;
          if (d < distance) { distance = d; point = v.toArray(); }
        }
        const nodeName = obj.name.replace(/_geometry(?:_\d+)?$/, '');
        if (!points[nodeName]) points[nodeName] = point.map(v => Number(v.toFixed(7)));
      });
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
      return { data, points };
    }, { file, nodeId });
    const id = nodeId ?? 'heart-cutaway';
    await writeFile(new URL(`${id}.webp`, output), Buffer.from(result.data, 'base64'));
    if (!nodeId) Object.assign(heartPoints, result.points);
    console.log(`256px RGBA: ${id}`);
  }
  await writeFile(new URL('../src/content/anotaciones/puntos-corazon.json', import.meta.url), JSON.stringify(heartPoints,null,2)+'\n');
} finally { await browser?.close(); await server.close(); }
