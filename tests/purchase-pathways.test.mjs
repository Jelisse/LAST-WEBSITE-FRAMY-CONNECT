import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseSelection } from '../lib/purchase-structure.ts';

test('homepage and catalogue pathways preserve product and material selection', () => {
  for (const [input, format, card, keychain] of [
    ['card', 'card', 'PVC', 'PVC + epóxi'],
    ['pvc', 'card', 'PVC', 'PVC + epóxi'],
    ['wood', 'card', 'Madeira', 'PVC + epóxi'],
    ['metal', 'card', 'Metal', 'PVC + epóxi'],
    ['keychain', 'keychain', 'PVC', 'PVC + epóxi'],
    ['keychain-leather', 'keychain', 'PVC', 'Couro'],
    ['kit', 'kit', 'PVC', 'PVC + epóxi'],
  ]) assert.deepEqual(purchaseSelection(input), { format, card, keychain }, input);
  assert.equal(purchaseSelection().format, 'kit');
});
