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
