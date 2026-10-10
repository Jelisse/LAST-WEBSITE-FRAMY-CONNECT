import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const revision = 'fa2fa546052fba4c08921230a26cc69a333fca12';
const root = resolve('public/portrait-model');
await mkdir(resolve(root, 'Xenova/modnet/onnx'), { recursive: true });
await mkdir(resolve(root, 'runtime'), { recursive: true });
for (const file of [
  'config.json',
  'preprocessor_config.json',
  'onnx/model_quantized.onnx',
  'README.md',
]) {
  const response = await fetch(
    `https://huggingface.co/Xenova/modnet/resolve/${revision}/${file}`,
  );
  if (!response.ok)
    throw Error(`Model asset unavailable: ${file} (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > 25 * 1024 * 1024)
    throw Error(`Model asset exceeds Cloudflare limit: ${file}`);
  await writeFile(resolve(root, 'Xenova/modnet', file), bytes);
  console.log(`${file}: ${bytes.length} bytes`);
}
for (const file of [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
]) {
  await copyFile(
    resolve('node_modules/onnxruntime-web/dist', file),
    resolve(root, 'runtime', file),
  );
}
await copyFile(
  resolve('node_modules/@huggingface/transformers/LICENSE'),
  resolve(root, 'TRANSFORMERS-LICENSE'),
);
console.log(
  'Portrait matting assets ready. Model and runtime are served from this site; photographs stay on-device.',
);
