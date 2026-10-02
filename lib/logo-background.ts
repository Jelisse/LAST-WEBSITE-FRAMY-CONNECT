// Remove a uniform background connected to the image boundary. No image leaves the device.
export function clearLogoBackground(data: Uint8ClampedArray, width: number, height: number, tolerance: number) {
  const pixels = width * height;
  if (data.length !== pixels * 4 || !pixels) throw Error('Imagem inválida.');
  const corners = [0, width - 1, (height - 1) * width, pixels - 1];
  const samples = corners.filter((i) => data[i * 4 + 3] > 240);
  if (!samples.length) throw Error('O fundo já é transparente.');
  // Pick the corner colour with the greatest agreement, ignoring foreground in a corner.
  const distance = (a: number, b: number) => Math.max(...[0, 1, 2].map((c) => Math.abs(data[a * 4 + c] - data[b * 4 + c])));
  const seed = samples.sort((a, b) => samples.filter((i) => distance(b, i) < 25).length - samples.filter((i) => distance(a, i) < 25).length)[0];
  const background = [0, 1, 2].map((c) => data[seed * 4 + c]);
  const threshold = Math.max(0, Math.min(100, tolerance));
  const visited = new Uint8Array(pixels), queue = new Int32Array(pixels);
  let head = 0, tail = 0, removed = 0;
  const enqueue = (i: number) => {
    if (visited[i]) return;
    visited[i] = 1;
    if (data[i * 4 + 3] !== 0 && Math.max(...background.map((v, c) => Math.abs(data[i * 4 + c] - v))) > threshold) return;
    queue[tail++] = i;
  };
  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const i = queue[head++], x = i % width;
    if (data[i * 4 + 3]) removed++;
    data[i * 4 + 3] = 0;
    if (x > 0) enqueue(i - 1);
    if (x < width - 1) enqueue(i + 1);
    if (i >= width) enqueue(i - width);
    if (i < pixels - width) enqueue(i + width);
  }
  return removed;
}

/** Remove only matching background connected to the image edges. */
export function clearLogoBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  color: readonly number[],
  tolerance: number,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 2048 * 2048 ||
    data.length !== width * height * 4 ||
    color.length !== 3 ||
    !color.every((v) => Number.isFinite(v) && v >= 0 && v <= 255) ||
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    tolerance > 100
  )
    throw Error('Imagem ou tolerância inválida.');
  const seen = new Uint8Array(width * height),
    queue = new Uint32Array(width * height);
  let start = 0,
    end = 0,
    removed = 0;
  const visit = (pixel: number) => {
    if (seen[pixel]) return;
    seen[pixel] = 1;
    const i = pixel * 4;
    const distance = Math.max(
      Math.abs(data[i] - color[0]),
      Math.abs(data[i + 1] - color[1]),
      Math.abs(data[i + 2] - color[2]),
    );
    if (data[i + 3] === 0 || distance <= tolerance) queue[end++] = pixel;
  };
  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (start < end) {
    const pixel = queue[start++];
    if (data[pixel * 4 + 3]) removed++;
    data[pixel * 4 + 3] = 0;
    if (pixel % width) visit(pixel - 1);
    if (pixel % width < width - 1) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel < width * (height - 1)) visit(pixel + width);
  }
  return removed;
}

export async function removeLogoBackground(
  blob: Blob,
  hex: string,
  tolerance: number,
): Promise<Blob> {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw Error('Escolha a cor do fundo.');
  const image = await createImageBitmap(blob);
  try {
    const ratio = Math.min(1, 2048 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Não foi possível preparar a imagem.');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const removed = clearLogoBackgroundColor(
      pixels.data,
      canvas.width,
      canvas.height,
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
      tolerance,
    );
    if (!removed)
      throw Error(
        'Não foi encontrado fundo dessa cor nas margens. Ajuste a cor ou a tolerância.',
      );
    if (!pixels.data.some((v, i) => i % 4 === 3 && v > 0))
      throw Error(
        'A remoção apagaria toda a imagem. Reduza a tolerância ou escolha outra cor.',
      );
    ctx.putImageData(pixels, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result
            ? resolve(result)
            : reject(Error('Não foi possível criar o PNG.')),
        'image/png',
      ),
    );
  } finally {
    image.close();
  }
}
