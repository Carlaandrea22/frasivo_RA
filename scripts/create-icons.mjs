import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const asset = name => new URL(`../public/${name}`, import.meta.url);
const source = await readFile(asset('icon.svg'), 'utf8');
const square = source.replace(' rx="42"', '');
const maskable = square.replace('<g id="glyph">', '<g id="glyph" transform="translate(16 16) scale(.834)">');
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage();
  async function raster(svg, size) {
    const png = await page.evaluate(async ({ svg, size }) => {
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(image, 0, 0, size, size);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { svg, size });
    return Buffer.from(png, 'base64');
  }
  for (const [name, size, svg] of [
    ['icon-192.png', 192, source],
    ['icon-512.png', 512, source],
    ['icon-maskable.png', 512, maskable],
    ['apple-touch-icon.png', 180, square],
  ]) {
    await writeFile(asset(name), await raster(svg, size));
  }
  const sizes = [16, 32, 48];
  const images = [];
  for (const size of sizes) images.push(await raster(source, size));
  const directory = Buffer.alloc(6 + sizes.length*16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(sizes.length, 4);
  let offset = directory.length;
  images.forEach((image, index) => {
    const entry = 6 + index*16;
    directory[entry] = directory[entry+1] = sizes[index];
    directory.writeUInt16LE(1, entry+4);
    directory.writeUInt16LE(32, entry+6);
    directory.writeUInt32LE(image.length, entry+8);
    directory.writeUInt32LE(offset, entry+12);
    offset += image.length;
  });
  await writeFile(asset('favicon.ico'), Buffer.concat([directory, ...images]));
} finally {
  await browser.close();
}
