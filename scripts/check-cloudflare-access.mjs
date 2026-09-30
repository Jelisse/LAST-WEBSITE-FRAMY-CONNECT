import { readFileSync } from 'node:fs';

const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
if (!token) throw Error('CLOUDFLARE_API_TOKEN is empty or unavailable to this workflow.');
if (!account || !/^[a-f0-9]{32}$/i.test(account))
  throw Error('CLOUDFLARE_ACCOUNT_ID must contain only the 32-character hexadecimal Cloudflare Account ID, without a URL, label, quotation marks or hyphens.');
const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
if (config.name !== 'framy-connect-staging' ||
    config.d1_databases?.[0]?.database_id !== 'd53a1009-119e-41c2-9f05-db685dc9a0f4' ||
    !['false', 'true'].includes(config.vars?.PAYSUITE_ENABLED)) {
  throw Error('Unexpected deployment target or invalid payment activation flag.');
}
async function get(path, label) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
  });
  // Never print API bodies, credentials, or secret values.
  if (!response.ok) throw Error(`${label} failed (HTTP ${response.status}). Check the account ID and token permissions.`);
  const body = await response.json();
  if (!body.success) throw Error(`${label} failed. Check Cloudflare configuration.`);
  return body.result;
}
const database = await get(`d1/database/${config.d1_databases[0].database_id}`, 'Database access');
if (database.name !== 'framy-connect-staging') throw Error('Unexpected database name.');
const secrets = await get(`workers/scripts/${config.name}/secrets`, 'Worker secret metadata access');
for (const name of ['PAYSUITE_API_TOKEN', 'PAYSUITE_WEBHOOK_SECRET']) {
  if (!Array.isArray(secrets) || !secrets.some(secret => secret.name === name && secret.type === 'secret_text')) {
    throw Error(`Missing encrypted Worker secret: ${name}`);
  }
}
console.log(`Correct Worker and database found. Both PaySuite secret names are present; their values were not retrieved. Gateway flag in this build: ${config.vars.PAYSUITE_ENABLED}.`);
