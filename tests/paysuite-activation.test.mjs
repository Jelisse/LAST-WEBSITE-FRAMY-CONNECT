import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
test('payment activation preserves manager prices and does not reset opening grace on retry', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort()) db.exec(readFileSync(`drizzle/${file}`, 'utf8'));
    db.exec("UPDATE checkout_pricing SET customer_design=17000,team_design=60000,maputo_delivery=25000; UPDATE profile_billing_settings SET instructions='Manager instructions';");
    const activate = readFileSync('scripts/paysuite-activation.sql', 'utf8');
    db.exec(activate);
    const prices = db.prepare('SELECT * FROM checkout_pricing').get();
    assert.equal(prices.enabled, 1);
    assert.equal(prices.customer_design, 17000);
    assert.equal(prices.team_design, 60000);
    assert.equal(prices.maputo_delivery, 25000);
    const billing = db.prepare('SELECT * FROM profile_billing_settings').get();
    assert.equal(billing.enabled, 1);
    assert.ok(billing.opened_at);
    assert.equal(billing.instructions, 'Manager instructions');
    db.exec(activate);
    assert.deepEqual(db.prepare('SELECT * FROM checkout_pricing').get(), prices);
    assert.deepEqual(db.prepare('SELECT * FROM profile_billing_settings').get(), billing);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM manager_audit WHERE id='paysuite-live-launch-v1'").get().n, 1);
  } finally { db.close(); }
});
