import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purchaseProduct, purchaseHistory } from '../lib/purchase-history.ts';
test('purchase summaries allowlist product presentation and preserve material destination without exposing private snapshots', () => {
  const result = purchaseProduct(JSON.stringify({format:'card',card:'Madeira',contact:'private',address:'private',profileSnapshot:{email:'private'},cardArtwork:{assetId:'private'}}));
  assert.equal(result.selection,'wood');
  assert.deepEqual(Object.keys(result).sort(),['image','name','selection']);
  assert.equal(purchaseProduct('{'),null);
  assert.equal(purchaseProduct('null'),null);
  assert.equal(purchaseProduct('{"format":"unknown"}'),null);
  assert.equal(purchaseProduct('{"format":"keychain","keychain":"Couro"}').selection,'keychain-leather');
});
test('history groups attempts only when they belong to the same order and retains confirmed status', () => {
  const base={kind:'product',amount:45000,cycle:'once',paymentReference:'payment'};
  const rows=[{...base,id:'latest-failed',orderReference:'order-a',status:'failed',created_at:'2026-10-24'}, {...base,id:'confirmed',orderReference:'order-a',status:'paid',created_at:'2026-10-23'}, {...base,id:'other-order',orderReference:'order-b',status:'pending',created_at:'2026-10-24'}, {...base,id:'subscription',kind:'subscription',status:'failed',created_at:'2026-10-22'}];
  const result=purchaseHistory(rows);
  assert.equal(result.length,3);
  assert.ok(result.some(p=>p.id==='confirmed'));
  assert.ok(result.some(p=>p.id==='other-order'));
  assert.ok(result.some(p=>p.id==='subscription'));
  assert.equal(rows.length,4);
});
