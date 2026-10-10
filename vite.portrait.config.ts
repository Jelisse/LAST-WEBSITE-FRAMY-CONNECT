import { defineConfig } from 'vite';
// Build separately so framework browser/bootstrap code never enters the worker.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'public/portrait-model/worker',
    emptyOutDir: false,
    rollupOptions: {
      input: 'workers/portrait-matting.ts',
      output: { entryFileNames: 'portrait-worker.js', format: 'es' },
    },
  },
});
