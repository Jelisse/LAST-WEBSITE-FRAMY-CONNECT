import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fulfilmentDefaults,
  validateFulfilment,
  fulfilmentQuote,
  readFulfilment,
} from '../lib/fulfilment.ts';
test('delivery rules reject invalid rates, mismatched points and unavailable cities', () => {
  const original = structuredClone(fulfilmentDefaults);
  assert.equal(
    fulfilmentQuote(original, {
      city: 'maputo',
      delivery: 'pickup',
      pickupPoint: 'mahota',
    }).fee,
    0,
  );
  assert.equal(
    fulfilmentQuote(original, { city: 'maputo', delivery: 'standard' }).fee,
    20000,
  );
  assert.throws(() =>
    fulfilmentQuote(original, { city: 'maputo', delivery: 'express' }),
  );
  const modified = structuredClone(original);
  modified.cities[0].expressFee = 35000;
  assert.equal(
    fulfilmentQuote(validateFulfilment(modified), {
      city: 'maputo',
      delivery: 'express',
    }).fee,
    35000,
  );
  modified.points[0].active = false;
  assert.throws(() =>
    fulfilmentQuote(modified, {
      city: 'maputo',
      delivery: 'pickup',
      pickupPoint: 'mahota',
    }),
  );
  modified.cities[0].standardFee = -1;
  assert.throws(() => validateFulfilment(modified));
  assert.equal(readFulfilment('invalid'), null);
});
