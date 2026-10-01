import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeConsent, consentLifetime } from '../lib/measurement-consent.ts';
import { loginDestination } from '../lib/auth-policy.ts';
import { readPurchaseDraft } from '../lib/purchase-draft.ts';

test('optional measurement requires a current versioned choice', () => {
  const now = 100000;
  for (const raw of [null, 'yes', 'no', '{}', 'broken', JSON.stringify({ version: 0, choice: 'yes', expires: now + 10 }), JSON.stringify({ version: 1, choice: 'yes', expires: now - 1 })])
    assert.equal(decodeConsent(raw, now), null);
  for (const choice of ['yes', 'no']) assert.equal(decodeConsent(JSON.stringify({ version: 1, choice, expires: now + consentLifetime }), now), choice);
});
test('configuration and payment return survive customer authentication without permitting redirect injection', () => {
  for (const path of ['/comprar', '/comprar?formato=card', '/comprar?formato=keychain', '/comprar?formato=kit', '/checkout/retorno', '/checkout/retorno?payment=abc-123']) {
    assert.equal(loginDestination('customer', path), path);
    assert.equal(loginDestination('manager', path), '/manager');
  }
  for (const path of ['//evil.test', '/comprar?formato=keychain&next=//evil.test', '/checkout/retorno?payment=abc#secret', '/comprar?formato=unknown'])
    assert.equal(loginDestination('customer', path), '/dashboard');
});
test('purchase restoration rejects expired and malformed data and keeps selections', () => {
  const draft = { version: 1, expires: 1100, card: 'Madeira', keychain: 'Couro', design: 'team', delivery: 'maputo', contact: '841234567', address: 'Maputo, Rua de exemplo', designInstructions: 'Azul' };
  assert.equal(readPurchaseDraft(JSON.stringify(draft), 1000).card, 'Madeira');
  assert.equal(readPurchaseDraft(JSON.stringify(draft), 1200), null);
  assert.equal(readPurchaseDraft(JSON.stringify({ ...draft, design: 'free' }), 1000), null);
  assert.equal(readPurchaseDraft(JSON.stringify({ ...draft, address: 123 }), 1000), null);
  assert.equal(readPurchaseDraft('broken', 1000), null);
});
