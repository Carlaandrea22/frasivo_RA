import { BufferAttribute, BufferGeometry, InterleavedBuffer, InterleavedBufferAttribute, type TypedArray } from 'three';
import { MeshBVH } from 'three-mesh-bvh';

export interface OcclusionGeometry {
  positions: TypedArray;
  index: TypedArray | null;
  stride: number;
  offset: number;
  normalized: boolean;
}

self.onmessage = ({ data }: MessageEvent<OcclusionGeometry[]>) => {
  const transfer: ArrayBuffer[] = [];
  const results = data.map(({ positions, index, stride, offset, normalized }) => {
    try {
      const geometry = new BufferGeometry();
      const position = stride === 3 && offset === 0
        ? new BufferAttribute(positions, 3, normalized)
        : new InterleavedBufferAttribute(new InterleavedBuffer(positions, stride), 3, offset, normalized);
      geometry.setAttribute('position', position);
      if (index) geometry.setIndex(new BufferAttribute(index, 1));
      const tree = new MeshBVH(geometry, { indirect: true, setBoundingBox: false });
      const serialized = MeshBVH.serialize(tree, { cloneBuffers: false });
      serialized.index = null; // Deserialization reuses the viewer's original index.
      transfer.push(...serialized.roots);
      if (serialized.indirectBuffer?.buffer instanceof ArrayBuffer) transfer.push(serialized.indirectBuffer.buffer);
      return serialized;
    } catch {
      return null; // The viewer uses native raycasting for unsupported geometry.
    }
  });
  self.postMessage(results, { transfer });
};
