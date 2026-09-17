import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const source = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
if (
  !source.r2_buckets?.some(
    (bucket) => bucket.binding === 'PROFILE_PHOTOS' && bucket.bucket_name,
  )
)
  throw Error(
    'Configure the actual PROFILE_PHOTOS R2 bucket in wrangler.jsonc before a direct Cloudflare deployment. Sites manages this binding separately.',
  );
const build = spawnSync(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'build'],
  { stdio: 'inherit', env: { ...process.env, FRAMY_STAGING: 'true' } },
);
if (build.status !== 0) process.exit(build.status ?? 1);
const config = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
const databases = config.d1_databases ?? [];
if (
  databases.length !== 1 ||
  databases[0].binding !== 'DB' ||
  databases[0].database_id === '00000000-0000-4000-8000-000000000000'
)
  throw Error('Invalid Cloudflare database binding; deployment stopped.');
console.log(
  'Cloudflare build ready. Deploy dist/server/wrangler.json with its generated client assets.',
);
