import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products, publicProduct } from '../lib/catalog.ts';
import { validateProduct } from '../lib/product-validation.ts';
const seed = products.find((p) => p.id === 'metal');
test('catalogue includes each of the twelve products once', () => {
  assert.equal(products.length, 12);
  assert.equal(new Set(products.map((p) => p.id)).size, 12);
});
test('public catalogue never contains internal costs', () => {
  assert.equal('cost' in publicProduct(seed), false);
});
test('product edits preserve ID and icon and accept integer minor units', () => {
  const p = validateProduct(
    { ...seed, id: 'other', icon: 'evil', amount: 12345, name: ' New name ' },
    seed,
  );
  assert.equal(p.id, 'metal');
  assert.equal(p.icon, seed.icon);
  assert.equal(p.name, 'New name');
  assert.equal(p.amount, 12345);
});
test('reject malformed prices, unsafe image sources and free available products', () => {
  for (const patch of [
    { amount: -1 },
    { amount: NaN },
    { amount: 12.3 },
    { cost: -1 },
    { amount: 0 },
    { imageUrl: 'javascript:alert(1)' },
    { imageUrl: 'https://external.example/image.png' },
    { version: -1 },
    { category: 'unknown' },
  ])
    assert.throws(() =>
      validateProduct({ ...seed, available: true, ...patch }, seed),
    );
});
test('zero price allowed when a product is under consultation', () => {
  assert.equal(
    validateProduct({ ...seed, amount: 0, available: false }, seed).available,
    false,
  );
});
