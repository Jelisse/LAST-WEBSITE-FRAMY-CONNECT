import QRCode from 'qrcode';
// Portable PNG encoding: no canvas/native modules required in a Worker.
function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Uint8Array) {
  const out = new Uint8Array(data.length + 12),
    view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(name), 4);
  out.set(data, 8);
  view.setUint32(data.length + 8, crc32(out.subarray(4, data.length + 8)));
  return out;
}
export async function qrPNG(url: string) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' }),
    scale = 6,
    margin = 4,
    size = (qr.modules.size + margin * 2) * scale;
  const pixels = new Uint8Array((size + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const row = Math.floor(y / scale) - margin,
        col = Math.floor(x / scale) - margin;
      pixels[y * (size + 1) + x + 1] =
        row >= 0 &&
        col >= 0 &&
        row < qr.modules.size &&
        col < qr.modules.size &&
        qr.modules.get(row, col)
          ? 0
          : 255;
    }
  const header = new Uint8Array(13),
    view = new DataView(header.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  header[8] = 8;
  const compressed = new Uint8Array(
    await new Response(
      new Blob([pixels]).stream().pipeThrough(new CompressionStream('deflate')),
    ).arrayBuffer(),
  );
  return new Blob(
    [
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', compressed),
      chunk('IEND', new Uint8Array()),
    ],
    { type: 'image/png' },
  );
}
