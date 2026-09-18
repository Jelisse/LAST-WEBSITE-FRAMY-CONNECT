import test from 'node:test';
import assert from 'node:assert/strict';
import { planMeticais, planPrice } from '../lib/plan-pricing.ts';
test('legacy USD terms convert once and explicit metical prices take precedence', () => {
  assert.equal(planMeticais({ dollars: 3 }), 191.73);
  assert.equal(planMeticais({ dollars: 3, meticais: 200 }), 200);
  assert.equal(planMeticais({ dollars: 3, meticais: 0 }), 0);
  assert.equal(planMeticais({ meticais: planMeticais({ dollars: 5 }) }), 319.55);
  assert.match(planPrice({ meticais: 63.91 }), /MT$/);
  assert.doesNotMatch(planPrice({ dollars: 3 }), /USD|US\$/);
});
