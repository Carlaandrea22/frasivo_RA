export function readGlb(bytes) {
  const length = bytes.readUInt32LE(12);
  return { data: JSON.parse(bytes.toString('utf8', 20, 20 + length)), binary: bytes.subarray(28 + length) };
}

export function writeGlb(data, binary) {
  const json = Buffer.from(JSON.stringify(data));
  const padding = Buffer.alloc((4 - json.length % 4) % 4, 0x20);
  const binPadding = Buffer.alloc((4 - binary.length % 4) % 4);
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + padding.length + binary.length + binPadding.length, 8);
  header.writeUInt32LE(json.length + padding.length, 12);
  header.write('JSON', 16);
  const chunk = Buffer.alloc(8);
  chunk.writeUInt32LE(binary.length + binPadding.length, 0);
  chunk.write('BIN', 4);
  return Buffer.concat([header, json, padding, chunk, binary, binPadding]);
}
