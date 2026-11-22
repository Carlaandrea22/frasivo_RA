import { writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  stdin: {
    resolveDir: process.cwd(),
    contents: `
      import { DataUtils, PMREMGenerator, WebGLRenderer } from 'three';
      import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

      window.bakeEnvironment = () => {
        const renderer = new WebGLRenderer();
        const generator = new PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        const target = generator.fromScene(room, .04, .1, 100, { size: 256 });
        const gl = renderer.getContext();
        const levels = target.texture.mipmaps;
        const bytes = new Uint8Array(8 + levels.reduce((sum, { width }) => sum + 6 * width ** 2 * 8, 0));
        const data = new DataView(bytes.buffer);
        data.setUint32(0, target.width, true);
        data.setUint32(4, levels.length, true);

        try {
          let offset = 8;
          for (const [level, { width }] of levels.entries()) {
            // Uploaded cubes reflect X relative to render-target cubes in WebGLMaterials.
            for (const face of [1, 0, 2, 3, 4, 5]) {
              renderer.setRenderTarget(target, face, level);
              const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
              if (type !== gl.HALF_FLOAT && type !== gl.FLOAT) throw new Error('Lectura HDR no disponible');
              const pixels = type === gl.HALF_FLOAT ? new Uint16Array(width ** 2 * 4) : new Float32Array(width ** 2 * 4);
              gl.readPixels(0, 0, width, width, gl.RGBA, type, pixels);
              if (gl.getError() !== gl.NO_ERROR || !pixels.some(value => value > 0)) {
                throw new Error('No se pudo leer la cara ' + face + ' del mip ' + level);
              }
              for (let row = 0; row < width; row++) {
                for (let column = width - 1; column >= 0; column--) {
                  const index = (row * width + column) * 4;
                  for (let channel = 0; channel < 4; channel++) {
                    const value = pixels[index + channel];
                    data.setUint16(offset, type === gl.HALF_FLOAT ? value : DataUtils.toHalfFloat(value), true);
                    offset += 2;
                  }
                }
              }
            }
          }
          let binary = '';
          for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
          return btoa(binary);
        } finally {
          renderer.setRenderTarget(null);
          target.dispose();
          generator.dispose();
          room.dispose();
          renderer.dispose();
        }
      };
    `,
  },
  bundle: true,
  write: false,
});

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: outputFiles[0].text });
  const pixels = Buffer.from(await page.evaluate(() => window.bakeEnvironment()), 'base64');
  const bytes = gzipSync(pixels, { level: 9 });
  await writeFile(new URL('../src/shared/visor3d/room-environment.bin', import.meta.url), bytes);
  console.log(`PMREM de ${pixels.readUInt32LE(0)} px, ${pixels.readUInt32LE(4)} niveles, ${bytes.length} bytes.`);
} finally {
  await browser.close();
}
