import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Inspect schema only: no customer records, passwords, documents or order data.
const expected = new DatabaseSync(':memory:');
for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort())
  expected.exec(readFileSync(`drizzle/${file}`, 'utf8'));
const schemaSQL = `SELECT m.name AS table_name, p.name AS column_name
  FROM sqlite_master m JOIN pragma_table_info(m.name) p
  WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'
  ORDER BY m.name,p.cid`;
const required = expected.prepare(schemaSQL).all();
expected.close();
const result = spawnSync(process.execPath, [
  'node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB',
  '--remote', '--config', 'wrangler.jsonc', '--command', schemaSQL, '--json',
], { encoding: 'utf8' });
if (result.status !== 0) {
  console.error('Não foi possível verificar o esquema D1. Confirme o login Cloudflare e o acesso à base de staging. Nenhum dado foi alterado.');
  process.exit(1);
}
let rows;
try { rows = JSON.parse(result.stdout).flatMap(r => r.results ?? []); }
catch { console.error('Resposta de verificação inválida. Publicação bloqueada.'); process.exit(1); }
const actual = new Set(rows.map(r => `${r.table_name}.${r.column_name}`));
const missing = required.map(r => `${r.table_name}.${r.column_name}`).filter(key => !actual.has(key));
if (missing.length) {
  console.error('Publicação bloqueada: faltam tabelas/colunas D1:');
  for (const key of missing) console.error(`- ${key}`);
  console.error('Compare as migrações aplicadas e aplique apenas as pendentes; não reinicialize a base.');
  process.exit(1);
}
console.log('Esquema D1 compatível com todas as migrações do projecto.');
