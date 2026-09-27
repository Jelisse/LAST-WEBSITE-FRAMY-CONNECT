import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
import { heroDefaults, heroSlots } from '../lib/hero-media.ts';

test('hero settings cache expires, invalidates on edits and never caches failures', async () => {
  let now = 0, reads = 0, fail = false;
  const env = { PROFILE_PHOTOS: { async get() {
    reads++;
    if (fail) throw Error('R2 unavailable');
    return null;
  } } };
  const source = readFileSync('lib/server-hero-media.ts', 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  // oxlint-disable-next-line typescript/no-implied-eval -- Execute local transpiled code with isolated Cloudflare mocks.
  const { getHeroMedia, invalidateHeroMedia } = new Function('env', 'heroDefaults', 'heroSlots', 'Date',
    js + '\nreturn { getHeroMedia, invalidateHeroMedia };')(env, heroDefaults, heroSlots, { now: () => now });
  const first = await getHeroMedia();
  first.card = 'must not mutate cache';
  assert.deepEqual(await getHeroMedia(), heroDefaults);
  assert.equal(reads, 8);
  now = 30_001;
  await getHeroMedia();
  assert.equal(reads, 16);
  invalidateHeroMedia();
  fail = true;
  await assert.rejects(getHeroMedia(), /R2 unavailable/);
  fail = false;
  assert.deepEqual(await getHeroMedia(), heroDefaults);
  assert.equal(reads, 32);
});

test('stock queries use product and customer indexes; migration preserves later stock changes', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort())
      db.exec(readFileSync('drizzle/' + file, 'utf8'));
    const plan = query => db.prepare('EXPLAIN QUERY PLAN ' + query).all().map(r => r.detail).join(' ');
    assert.match(plan("SELECT COUNT(*) FROM sandbox_orders WHERE json_extract(data_json,'$.productId')='keychain' AND json_extract(data_json,'$.status') IN ('PENDING_PAYMENT','QUEUED','IN_PRODUCTION','READY')"), /orders_product_status/);
    assert.match(plan("SELECT COUNT(*) FROM sandbox_orders WHERE owner_id='customer' AND json_extract(data_json,'$.status')='PENDING_PAYMENT'"), /orders_owner_status/);
    assert.match(plan("SELECT id FROM sandbox_orders WHERE json_extract(data_json,'$.status')='PENDING_PAYMENT' AND json_extract(data_json,'$.paid')=0 AND COALESCE(json_extract(data_json,'$.reservationExpiresAt'),strftime('%Y-%m-%dT%H:%M:%fZ',created_at,'+1 day'))<='2026-09-27' ORDER BY created_at LIMIT 100"), /orders_expiration/);
    db.exec("UPDATE stock_movements SET quantity=499 WHERE id='owner-count-keychain-20260918'");
    db.exec(readFileSync('drizzle/0012_purchase_performance.sql', 'utf8').split('--> statement-breakpoint')[0]);
    assert.equal(db.prepare("SELECT SUM(quantity) AS total FROM stock_movements WHERE product_id='keychain'").get().total, 499);
  } finally { db.close(); }
});
