import {
  CompressedCubeTexture, HalfFloatType, LinearSRGBColorSpace, type CompressedTextureMipmap,
} from 'three';

interface CubeFace {
  width: number;
  height: number;
  mipmaps: CompressedTextureMipmap[];
}

let cachedFaces: Promise<CubeFace[]> | undefined;

async function fetchFaces() {
  const response = await fetch(new URL('./room-environment.bin', import.meta.url));
  if (!response.ok || !response.body) throw new Error('No se pudo cargar la iluminación de estudio.');
  const bytes = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const header = new DataView(bytes);
  const size = header.getUint32(0, true);
  const levels = header.getUint32(4, true);
  if (!size || !Number.isInteger(Math.log2(size)) || !levels || levels > Math.log2(size) + 1) {
    throw new Error('Dimensiones inválidas de la iluminación de estudio.');
  }
  const faces: CubeFace[] = Array.from({ length: 6 }, () => ({ width: size, height: size, mipmaps: [] }));
  // The baked data is ordered by mip level, then face (+X, -X, +Y, -Y, +Z, -Z).
  let offset = 8;
  for (let level = 0; level < levels; level++) {
    const width = size / 2 ** level;
    const length = width * width * 4;
    for (const face of faces) {
      const data = new Uint16Array(bytes, offset, length);
      offset += data.byteLength;
      face.mipmaps.push({ data, width, height: width });
    }
  }
  if (offset !== bytes.byteLength) throw new Error('Tamaño inválido de la iluminación de estudio.');
  return faces;
}

export function loadRoomEnvironment() {
  return cachedFaces ??= fetchFaces().catch(error => {
    cachedFaces = undefined;
    throw error;
  });
}

export function createRoomEnvironment(faces: CubeFace[]) {
  // RGBA half-float cubes use the compressed cube uploader's explicit mip levels.
  const texture = new CompressedCubeTexture(faces, undefined, HalfFloatType);
  texture.colorSpace = LinearSRGBColorSpace;
  texture.isPMREMTexture = true;
  texture.name = 'RoomEnvironment PMREM';
  texture.needsUpdate = true;
  return texture;
}
