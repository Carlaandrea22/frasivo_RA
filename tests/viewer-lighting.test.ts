import { gzipSync } from 'node:zlib';
import { CubeReflectionMapping, HalfFloatType, LinearSRGBColorSpace, RGBAFormat } from 'three';
import { expect, it, vi } from 'vitest';
import { createRoomEnvironment, loadRoomEnvironment } from '../src/shared/visor3d/roomEnvironment';

it('reutiliza los píxeles de iluminación prefiltrada y crea una textura por visor', async () => {
  const bytes = Buffer.alloc(8 + (8 * 8 + 4 * 4) * 6 * 4 * 2);
  bytes.writeUInt32LE(8, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt16LE(0x3c00, 8);
  bytes.writeUInt16LE(0x4000, 8 + 6 * 8 * 8 * 4 * 2);
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array(gzipSync(bytes))));
  try {
    const [firstData, secondData] = await Promise.all([loadRoomEnvironment(), loadRoomEnvironment()]);
    expect(fetch).toHaveBeenCalledOnce();
    const first = createRoomEnvironment(firstData);
    const second = createRoomEnvironment(secondData);
    expect(first).not.toBe(second);
    expect(first.image).toBe(firstData);
    expect(second.image).toBe(firstData);
    expect(firstData[0].mipmaps.map(mip => [mip.width, mip.height, mip.data[0]])).toEqual([
      [8, 8, 0x3c00], [4, 4, 0x4000],
    ]);
    expect(firstData[5].mipmaps.map(mip => mip.data[0])).toEqual([0, 0]);
    expect(first.isPMREMTexture).toBe(true);
    expect(first.type).toBe(HalfFloatType);
    expect(first.format).toBe(RGBAFormat);
    expect(first.colorSpace).toBe(LinearSRGBColorSpace);
    expect(first.mapping).toBe(CubeReflectionMapping);
    first.dispose();
    second.dispose();
  } finally {
    fetch.mockRestore();
  }
});
