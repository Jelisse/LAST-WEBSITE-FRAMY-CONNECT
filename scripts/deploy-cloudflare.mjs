import { spawnSync } from 'node:child_process';
// Never publish a new UI over an older, incompatible database schema.
for (const args of [
  ['scripts/check-cloudflare-db.mjs'],
  ['scripts/build-cloudflare.mjs'],
  ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--config', 'dist/server/wrangler.json'],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
