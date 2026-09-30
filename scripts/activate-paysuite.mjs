import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
if (config.name !== 'framy-connect-staging' ||
    config.d1_databases?.[0]?.database_id !== 'd53a1009-119e-41c2-9f05-db685dc9a0f4' ||
    config.vars?.PAYSUITE_ENABLED !== 'true') throw Error('Unexpected payment activation target.');
for (const name of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN']) {
  if (!process.env[name]?.trim()) throw Error(`Missing ${name}.`);
  process.env[name] = process.env[name].trim();
}
function query(sql) {
  const result = spawnSync(process.execPath, [
    'node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--remote',
    '--config', 'wrangler.jsonc', '--command', sql, '--json',
  ], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw Error('Payment activation database query failed. No response body or credentials are printed.');
  return JSON.parse(result.stdout).flatMap(row => row.results ?? []);
}
const settingsSQL = "SELECT 'products' AS area,enabled,version FROM checkout_pricing WHERE id=1 UNION ALL SELECT 'profiles' AS area,enabled,version FROM profile_billing_settings WHERE id=1";
if (query(settingsSQL).length !== 2) throw Error('Payment settings missing. Apply migrations first.');
if (process.argv.includes('--apply')) {
  // Preserve every manager price, plan, customer trial, invoice and entitlement.
  // Repeated activation does not restart the billing-opening grace period.
  const sql = readFileSync(new URL('./paysuite-activation.sql', import.meta.url), 'utf8');
  query(sql);
  const state = query(settingsSQL);
  if (state.length !== 2 || state.some(row => row.enabled !== 1)) throw Error('Activation incomplete. Inspect the two billing switches.');
  console.log('Product checkout and profile billing enabled. Existing prices preserved. No payment initiated.');
} else {
  console.log('Read-only: payment settings exist. Use --apply only after secret replacement and deployment.');
}
