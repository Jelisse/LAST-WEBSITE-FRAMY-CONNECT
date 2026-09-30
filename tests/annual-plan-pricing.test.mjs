import test from 'node:test';
import assert from 'node:assert/strict';
import { planAnnualMeticais } from '../lib/plan-pricing.ts';

test('annual display defaults to ten months and respects manager overrides', () => {
  assert.equal(planAnnualMeticais({ meticais: 100 }), 1000);
  assert.equal(planAnnualMeticais({ meticais: 250 }), 2500);
  assert.equal(planAnnualMeticais({ meticais: 250, annualMeticais: 2800 }), 2800);
  assert.equal(planAnnualMeticais({ meticais: 0 }), 0);
  assert.equal(planAnnualMeticais({ meticais: 99.99 }), 999.9);
});
