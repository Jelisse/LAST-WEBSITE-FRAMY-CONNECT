import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readCloudflareSchema } from './cloudflare-schema.mjs';

for (const name of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'])
  if (process.env[name]) process.env[name] = process.env[name].trim();

// Inspect schema and the fixed inventory-migration marker only; no customer data.
const expected = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort())
  expected.exec(readFileSync(`drizzle/${file}`, 'utf8'));
const required = readCloudflareSchema(sql => sql.split(';').map(statement => expected.prepare(statement).all()));
expected.close();
function queryBatch(sql) {
 const result = spawnSync(process.execPath, [
  'node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB',
  '--remote', '--config', 'wrangler.jsonc', '--command', sql, '--json',
 ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (result.status !== 0) {
  console.error('Não foi possível verificar o esquema D1. Confirme o login Cloudflare e o acesso à base de staging. Nenhum dado foi alterado.');
  process.exit(1);
}
try { return JSON.parse(result.stdout).map(r => r.results ?? []); }
catch { console.error('Resposta de verificação inválida. Publicação bloqueada.'); process.exit(1); }
}
const actual = new Set(readCloudflareSchema(queryBatch));
const missing = required.filter(key => !actual.has(key));
if (missing.length) {
  console.error('Publicação bloqueada: faltam tabelas/colunas ou a migração de stock D1:');
  for (const key of missing) console.error(`- ${key}`);
  console.error('Compare as migrações aplicadas e aplique apenas as pendentes; não reinicialize a base.');
  process.exit(1);
}
const markers = queryBatch("SELECT 1 AS recorded FROM stock_movements WHERE id='owner-count-keychain-20260918'; SELECT 1 AS recorded FROM manager_audit WHERE id='owner-maputo-keychain-count-20260919'");
if (markers.length !== 2 || markers.some(rows => !rows.length))
  throw Error('Publicação bloqueada: falta a migração de stock D1.');
console.log('Esquema D1 compatível com todas as migrações do projecto.');
