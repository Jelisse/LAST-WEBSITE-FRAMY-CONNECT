import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const hosting = JSON.parse(readFileSync('.openai/hosting.json', 'utf8'));
if (hosting.d1 !== 'DB' || hosting.r2 !== 'PROFILE_PHOTOS')
  throw Error('DB and PROFILE_PHOTOS are required.');
const result = spawnSync(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'build'],
  { stdio: 'inherit', env: { ...process.env, FRAMY_STAGING: 'false' } },
);
process.exit(result.status ?? 1);
