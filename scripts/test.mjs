import { readdir } from 'node:fs/promises';
// Run in one process: supports the Windows sandbox without spawning test workers.
for (const file of (await readdir(new URL('../tests/', import.meta.url)))
  .filter((f) => f.endsWith('.test.mjs'))
  .sort())
  await import(new URL('../tests/' + file, import.meta.url));
