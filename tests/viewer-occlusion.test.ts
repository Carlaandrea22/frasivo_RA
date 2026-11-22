import { Worker as NodeWorker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
  BackSide, BufferAttribute, BufferGeometry, FrontSide, Group, InterleavedBuffer, InterleavedBufferAttribute,
  Mesh, MeshBasicMaterial, Raycaster, Vector3,
} from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createModelOcclusion } from '../src/shared/visor3d/modelOcclusion';
import { createOcclusionScheduler } from '../src/shared/visor3d/occlusionScheduler';

function triangle(normalized = false) {
  const geometry = new BufferGeometry();
  if (normalized) {
    const positions = new Int16Array([0, -32767, -32767, 16384, 0, 32767, -32767, 16384, 0, 0, 32767, 16384]);
    geometry.setAttribute('position', new InterleavedBufferAttribute(new InterleavedBuffer(positions, 4), 3, 1, true));
  } else {
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]), 3));
  }
  geometry.setIndex([0, 1, 2]);
  return geometry;
}

describe('oclusión del visor', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('acelera un triángulo cuantizado en un worker sin cambiar el índice ni el raycast nativo', async () => {
    const root = new Group();
    root.position.set(1, 2, -3);
    root.scale.set(2, .75, 3);
    const mesh = new Mesh(triangle(true), new MeshBasicMaterial());
    mesh.rotation.y = Math.PI / 5;
    root.add(mesh);
    root.updateMatrixWorld(true);
    const hit = mesh.localToWorld(new Vector3(.1, -.1, .5));
    const nearPoint = mesh.localToWorld(new Vector3(.1, -.1, 2.5));
    const aim = hit.clone().sub(nearPoint);
    const ray = new Raycaster(nearPoint, aim.clone().normalize());
    const expectedDistance = aim.length();
    const occlusion = createModelOcclusion([mesh]);
    const original = vi.spyOn(mesh, 'raycast');
    const index = mesh.geometry.index!;
    expect(occlusion.blocks(ray, [mesh])).toBe(true);
    expect(original).toHaveBeenCalledOnce();

    const bundle = await build({
      entryPoints: [fileURLToPath(new URL('../src/shared/visor3d/modelOcclusion.worker.ts', import.meta.url))],
      bundle: true, write: false, platform: 'node',
      banner: { js: `
        const { parentPort } = require('node:worker_threads');
        const self = {
          set onmessage(fn) { parentPort.on('message', data => fn({ data })); },
          postMessage(data, { transfer }) { parentPort.postMessage(data, transfer); },
        };
      ` },
    });
    vi.stubGlobal('Worker', class {
      private worker = new NodeWorker(bundle.outputFiles[0].text, { eval: true });
      set onmessage(listener: (event: { data: unknown }) => void) {
        this.worker.on('message', data => listener({ data }));
      }
      set onerror(listener: () => void) { this.worker.on('error', listener); }
      set onmessageerror(listener: () => void) { this.worker.on('messageerror', listener); }
      postMessage(data: unknown, transfer: ArrayBuffer[]) { this.worker.postMessage(data, transfer); }
      terminate() { void this.worker.terminate(); }
    });
    await new Promise<void>(resolve => occlusion.build(resolve));
    expect(mesh.geometry.index).toBe(index);
    expect(Array.from(index.array)).toEqual([0, 1, 2]);

    const expectParity = (expected: boolean) => {
      expect(ray.intersectObject(mesh, false).length > 0).toBe(expected);
      original.mockClear();
      expect(occlusion.blocks(ray, [mesh])).toBe(expected);
      expect(original).toHaveBeenCalledTimes(0);
    };

    ray.far = expectedDistance - .01;
    expectParity(false);
    ray.far = expectedDistance + .01;
    expectParity(true);
    ray.near = expectedDistance + .001;
    expectParity(false);
    ray.near = 0;
    mesh.material.side = BackSide;
    expectParity(false);
    mesh.material.side = FrontSide;
    mesh.material.visible = false;
    expect(occlusion.blocks(ray, [mesh])).toBe(false);
    expect(original).toHaveBeenCalledTimes(0);
    const otherViewer = createModelOcclusion([mesh]);
    await new Promise<void>(resolve => otherViewer.build(resolve));
    occlusion.dispose();
    mesh.material.visible = true;
    expect(occlusion.blocks(ray, [mesh])).toBe(true);
    expect(original).toHaveBeenCalledTimes(1);
    expect(otherViewer.blocks(ray, [mesh])).toBe(true);
    expect(original).toHaveBeenCalledTimes(1);
    otherViewer.dispose();
  });

  it('conserva un bloqueador visible detrás de un grupo con material invisible', () => {
    const geometry = triangle().toNonIndexed();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([
      -1, -1, 1, 1, -1, 1, 0, 1, 1,
      -1, -1, 0, 1, -1, 0, 0, 1, 0,
    ]), 3));
    geometry.addGroup(0, 3, 0);
    geometry.addGroup(3, 3, 1);
    const invisible = new MeshBasicMaterial({ visible: false });
    const visible = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, [invisible, visible]);
    const ray = new Raycaster(new Vector3(.15, -.15, 3), new Vector3(0, 0, -1));
    const occlusion = createModelOcclusion([mesh]);

    expect(occlusion.blocks(ray, [mesh])).toBe(true);
    visible.visible = false;
    expect(occlusion.blocks(ray, [mesh])).toBe(false);
    occlusion.dispose();
  });
});

describe('frecuencia de las comprobaciones de oclusión', () => {
  afterEach(() => vi.useRealTimers());

  it('limita las comprobaciones durante el giro y comprueba la última posición al quedar en reposo', () => {
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
    let cameraAngle = 0;
    const checkedAngles: number[] = [];
    const scheduler = createOcclusionScheduler(() => checkedAngles.push(cameraAngle));
    const moveCamera = (angle: number) => {
      cameraAngle = angle;
      if (scheduler.sample()) checkedAngles.push(cameraAngle);
    };

    moveCamera(0);
    for (let step = 1; step <= 60; step++) {
      vi.advanceTimersByTime(16);
      moveCamera(step);
    }
    expect(checkedAngles.length).toBeGreaterThanOrEqual(14);
    expect(checkedAngles.length).toBeLessThanOrEqual(16);
    vi.advanceTimersByTime(70);
    expect(checkedAngles.at(-1)).toBe(60);
    const count = checkedAngles.length;
    vi.advanceTimersByTime(500);
    expect(checkedAngles).toHaveLength(count);
  });

  it('actualiza una etiqueta nueva de inmediato y cancela el trabajo pendiente al perder el visor', () => {
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
    const refresh = vi.fn();
    const scheduler = createOcclusionScheduler(refresh);

    expect(scheduler.sample()).toBe(true);
    expect(scheduler.sample()).toBe(false);
    expect(scheduler.sample(true)).toBe(true);
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(0);
    expect(scheduler.sample()).toBe(true);
    expect(scheduler.sample()).toBe(false);
    scheduler.cancel();
    vi.advanceTimersByTime(100);
    expect(refresh).toHaveBeenCalledTimes(0);
  });
});
