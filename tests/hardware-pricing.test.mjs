import test from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../lib/catalog.ts';
import { hardwarePrices, hardwareEstimate } from '../lib/hardware-pricing.ts';
import { validateProduct } from '../lib/product-validation.ts';

test('approved hardware defaults and the kit saving use integer MZN minor units', () => {
  const prices = hardwarePrices(products);
  assert.deepEqual(hardwareEstimate(prices, 'card', 'PVC', 'PVC + epóxi'), {
    amount: 95000,
    saving: 0,
  });
  assert.deepEqual(hardwareEstimate(prices, 'keychain', 'PVC', 'PVC + epóxi'), {
    amount: 50000,
    saving: 0,
  });
  assert.deepEqual(hardwareEstimate(prices, 'kit', 'PVC', 'PVC + epóxi'), {
    amount: 135000,
    saving: 10000,
  });
  assert.equal(
    prices.some((p) => 'cost' in p),
    false,
  );
  assert.equal(hardwareEstimate(prices, 'card', 'Metal', 'PVC + epóxi'), null);
  assert.equal(hardwareEstimate(prices, 'kit', 'PVC', 'Couro'), null);
});

test('manager rates change estimates, preserve the independent base kit, and never advertise negative savings', () => {
  const changed = products.map((p) =>
    p.id === 'pvc'
      ? { ...p, amount: 110000, kitAmount: 145000 }
      : p.id === 'wood'
        ? { ...p, amount: 140000, configurationPriceConfirmed: true }
        : p,
  );
  const prices = hardwarePrices(changed);
  assert.deepEqual(hardwareEstimate(prices, 'kit', 'Madeira', 'PVC + epóxi'), {
    amount: 175000,
    saving: 15000,
  });
  assert.equal(
    hardwareEstimate(
      hardwarePrices(
        changed.map((p) => (p.id === 'pvc' ? { ...p, kitAmount: 180000 } : p)),
      ),
      'kit',
      'PVC',
      'PVC + epóxi',
    ).saving,
    0,
  );
  assert.equal(
    hardwareEstimate(
      hardwarePrices(
        changed.map((p) => (p.id === 'pvc' ? { ...p, published: false } : p)),
      ),
      'kit',
      'PVC',
      'PVC + epóxi',
    ),
    null,
  );
});

test('manager cannot confirm a zero price or save invalid kit amounts', () => {
  const pvc = products.find((p) => p.id === 'pvc');
  for (const kitAmount of [0, -1, 1.5, NaN, '135000', 100000001])
    assert.throws(() => validateProduct({ ...pvc, kitAmount }, pvc));
  assert.throws(() =>
    validateProduct(
      { ...pvc, amount: 0, configurationPriceConfirmed: true },
      pvc,
    ),
  );
  assert.throws(() =>
    validateProduct({ ...pvc, configurationPriceConfirmed: 'true' }, pvc),
  );
  assert.equal(
    validateProduct({ ...pvc, kitAmount: 125000 }, pvc).kitAmount,
    125000,
  );
});
