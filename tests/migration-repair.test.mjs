import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {migrationPlan,schemaInventorySQL} from '../scripts/cloudflare-migration-plan.mjs';
const files = readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
function snapshot(count) {
  const db = new DatabaseSync(':memory:');
  for (const file of files.slice(0,count)) db.exec(readFileSync(`drizzle/${file}`,'utf8'));
  const keys=db.prepare(schemaInventorySQL).all().map(r=>r.key);
  db.close();
  return keys;
}
test('database repair identifies missing post-auth migrations without replaying historical price edits', () => {
  assert.deepEqual(migrationPlan(snapshot(7),false).apply, [
    '0007_product_personalisation.sql','0009_launch_security.sql',
    '0010_catalog_applications.sql','0011_maputo_keychain_stock.sql',
  ]);
});
test('database repair is a no-op when schema and inventory migration are applied', () => {
  assert.deepEqual(migrationPlan(snapshot(files.length),true).apply, []);
});
test('database repair stops on partially applied migration instead of overwriting data', () => {
  assert.throws(()=>migrationPlan([...snapshot(7),'table:product_options'],false), /Partial migration 0007/);
});
test('database repair applies the guarded inventory correction when only its marker is missing', () => {
  assert.deepEqual(migrationPlan(snapshot(files.length),false).apply, ['0011_maputo_keychain_stock.sql']);
});
