import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import {
  migrationPlan,
  schemaInventorySQL,
} from '../scripts/cloudflare-migration-plan.mjs';
const files = readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql'))
  .sort();
function snapshot(count) {
  const db = new DatabaseSync(':memory:');
  for (const file of files.slice(0, count))
    db.exec(readFileSync(`drizzle/${file}`, 'utf8'));
  const keys = db
    .prepare(schemaInventorySQL)
    .all()
    .map((r) => r.key);
  db.close();
  return keys;
}
test('database repair identifies missing post-auth migrations without replaying historical price edits', () => {
  assert.deepEqual(migrationPlan(snapshot(7), false).apply, [
    '0007_product_personalisation.sql',
    '0009_launch_security.sql',
    '0010_catalog_applications.sql',
    '0011_maputo_keychain_stock.sql',
    '0012_purchase_performance.sql',
    '0013_website_analytics.sql',
    '0014_profile_engagement.sql',
    '0015_profile_growth.sql',
    '0016_customer_recovery.sql',
    '0017_paysuite.sql',
      '0018_subscription_management.sql',
      '0019_post_payment_profile.sql',
      '0020_payment_receipts_and_prices.sql',
      '0021_publish_base_products.sql',
      '0022_optional_fulfilment.sql',
  ]);
});
test('database repair is a no-op when schema and inventory migration are applied', () => {
  assert.deepEqual(migrationPlan(snapshot(files.length), true).apply, []);
});
test('database repair stops on partially applied migration instead of overwriting data', () => {
  assert.throws(
    () => migrationPlan([...snapshot(7), 'table:product_options'], false),
    /Partial migration 0007/,
  );
});
test('database repair applies the guarded inventory correction when only its marker is missing', () => {
  assert.deepEqual(migrationPlan(snapshot(files.length), false).apply, [
    '0011_maputo_keychain_stock.sql',
  ]);
});


test('base product publication exposes approved prices without inventing stock availability', () => {
  const db = new DatabaseSync(':memory:');
  db.exec("CREATE TABLE product_catalog(id TEXT PRIMARY KEY,data_json TEXT,version INTEGER,updated_at TEXT)");
  db.prepare('INSERT INTO product_catalog VALUES(?,?,1,?)').run('pvc',JSON.stringify({published:false,available:false,amount:95000,kitAmount:135000,configurationPriceConfirmed:true}),'2026-10-01');
  db.exec(readFileSync('drizzle/0021_publish_base_products.sql','utf8'));
  const row=db.prepare("SELECT * FROM product_catalog WHERE id='pvc'").get();const product=JSON.parse(row.data_json);
  assert.equal(product.published,true);assert.equal(product.available,false);assert.equal(product.amount,95000);assert.equal(product.kitAmount,135000);assert.equal(row.version,2);
  db.close();
});
