import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { migrationPlan, schemaInventorySQL, stockMarker } from './cloudflare-migration-plan.mjs';

const config = JSON.parse(readFileSync('wrangler.jsonc','utf8'));
for (const name of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'])
  if (process.env[name]) process.env[name] = process.env[name].trim();
if (config.name !== 'framy-connect-staging' || config.d1_databases?.length !== 1 ||
    config.d1_databases[0].database_id !== 'd53a1009-119e-41c2-9f05-db685dc9a0f4')
  throw Error('Unexpected database target. Repair stopped.');
function wrangler(args) {
  const r = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { encoding:'utf8', maxBuffer:16*1024*1024 });
  if (r.status !== 0) {
    const output = `${r.stderr ?? ''}\n${r.stdout ?? ''}`;
    const codes = [...output.matchAll(/(?:\[code:\s*|"code"\s*:\s*)(\d+)/g)].map(m => m[1]);
    const categories = ['Authentication error', 'permission', 'not authorized', 'SQLITE_ERROR', 'no such table', 'syntax error', 'fetch failed', 'account ID', 'API token'].filter(s => output.toLowerCase().includes(s.toLowerCase()));
    throw Error(`Cloudflare operation failed (${args[0]} ${args[1]}). Exit ${r.status}; codes: ${codes.join(', ') || 'none'}; category: ${categories.join(', ') || 'unclassified'}. No response data or credentials are printed.`);
  }
  return r.stdout;
}
function query(sql) {
  return JSON.parse(wrangler(['d1','execute','DB','--remote','--config','wrangler.jsonc','--command',sql,'--json'])).flatMap(r => r.results ?? []);
}
const keys = query(schemaInventorySQL).map(r => r.key);
const recorded = keys.includes('table:manager_audit') && query(`SELECT 1 AS recorded FROM manager_audit WHERE id='${stockMarker}'`).length > 0;
const plan = migrationPlan(keys, recorded);
console.log('Pending compatible migrations:', plan.apply.join(', ') || 'none');
if (!process.argv.includes('--apply')) {
  console.log('Read-only plan. Use --apply to back up and apply these pending migrations. Partial migrations always require manual inspection.');
  process.exit(0);
}
if (plan.apply.length) {
  if (process.argv.includes('--time-travel')) {
    const { bookmark } = JSON.parse(wrangler(['d1','time-travel','info','DB','--config','wrangler.jsonc','--json']));
    if (typeof bookmark !== 'string' || !/^[a-f0-9-]+$/i.test(bookmark))
      throw Error('No valid database recovery point. Migration stopped.');
    const recovery = `D1 recovery point before migration: ${bookmark}\nCaptured at: ${new Date().toISOString()}\nDatabase: framy-connect-staging\nTime Travel retention: 7 days on Free, 30 days on Paid. Restoration requires manual review because it overwrites later data.\n`;
    console.log(recovery);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, recovery);
  } else {
  mkdirSync('tmp/private-backups',{recursive:true});
  const backup = `tmp/private-backups/staging-${new Date().toISOString().replace(/[:.]/g,'-')}.sql`;
  wrangler(['d1','export','DB','--remote','--config','wrangler.jsonc','--output',backup]);
  console.log(`Private backup saved: ${backup}. Never commit or share this file.`);
  }
  for (const file of plan.apply) {
    wrangler(['d1','execute','DB','--remote','--config','wrangler.jsonc','--file',`drizzle/${file}`,'--yes','--json']);
    console.log(`Applied ${file}`);
  }
}
const check = spawnSync(process.execPath,['scripts/check-cloudflare-db.mjs'],{stdio:'inherit'});
process.exit(check.status ?? 1);
