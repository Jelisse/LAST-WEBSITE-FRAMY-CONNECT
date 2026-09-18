import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const build = spawnSync(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'build'],
  {
    stdio: 'inherit',
    env: { ...process.env, FRAMY_STAGING: 'true' },
  },
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const config = JSON.parse(
  readFileSync('dist/server/wrangler.json', 'utf8'),
);

const databases = config.d1_databases ?? [];

if (
  databases.length !== 1 ||
  databases[0].binding !== 'DB' ||
  databases[0].database_id !==
    'd53a1009-119e-41c2-9f05-db685dc9a0f4'
) {
  throw Error(
    'Invalid Cloudflare staging database binding; deployment stopped.',
  );
}

const buckets = config.r2_buckets ?? [];

if (
  !buckets.some(
    (bucket) =>
      bucket.binding === 'PROFILE_PHOTOS' &&
      bucket.bucket_name === 'framy-connect-profile-photos',
  )
) {
  throw Error(
    'Invalid Cloudflare PROFILE_PHOTOS R2 binding; deployment stopped.',
  );
}

console.log(
  'Cloudflare build ready with the staging D1 database and PROFILE_PHOTOS R2 bucket.',
);
