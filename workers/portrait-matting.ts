import { env, pipeline, type RawImage } from '@huggingface/transformers';
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = '/portrait-model/';
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/portrait-model/runtime/';
  env.backends.onnx.wasm.numThreads = 1;
}
type Segmenter = (photo: Blob) => Promise<RawImage[]>;
const createSegmenter = pipeline as unknown as (
  task: 'background-removal',
  model: string,
  options: { device: 'wasm'; dtype: 'q8' },
) => Promise<Segmenter>;
let segmenter: Promise<Segmenter> | undefined;
self.onmessage = async (event: MessageEvent<{ photo: Blob }>) => {
  try {
    self.postMessage({ status: 'loading' });
    segmenter ??= createSegmenter('background-removal', 'Xenova/modnet', {
      device: 'wasm',
      dtype: 'q8',
    });
    const remove = await segmenter;
    self.postMessage({ status: 'processing' });
    const result = await remove(event.data.photo);
    const output = result[0];
    if (!output) throw Error('No portrait returned');
    // Keep generated uploads within the existing 5 MB photo limit.
    const resized =
      output.width > 1200 || output.height > 1200
        ? await output.resize(
            Math.round(
              output.width *
                Math.min(1200 / output.width, 1200 / output.height),
            ),
            Math.round(
              output.height *
                Math.min(1200 / output.width, 1200 / output.height),
            ),
          )
        : output;
    const photo = await resized.toBlob('image/png');
    self.postMessage({ status: 'complete', photo });
  } catch (error) {
    segmenter = undefined;
    self.postMessage({
      status: 'error',
      diagnostic:
        error instanceof Error ? error.message : 'Portrait model failed',
    });
  }
};
