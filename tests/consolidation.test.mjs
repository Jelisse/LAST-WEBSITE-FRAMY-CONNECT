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
  const draft = { version: 2, expires: 1100, card: 'Madeira', keychain: 'Couro', design: 'team', delivery: 'standard', city:'maputo', pickupPoint:'', contact: '841234567', address: 'Maputo, Rua de exemplo', designInstructions: 'Azul' };
  assert.equal(readPurchaseDraft(JSON.stringify(draft), 1000).card, 'Madeira');
  assert.equal(readPurchaseDraft(JSON.stringify(draft), 1200), null);
  assert.equal(readPurchaseDraft(JSON.stringify({ ...draft, design: 'free' }), 1000), null);
  assert.equal(readPurchaseDraft(JSON.stringify({ ...draft, address: 123 }), 1000), null);
  assert.equal(readPurchaseDraft('broken', 1000), null);
});

test('card and PVC artwork drafts restore independently and reject malformed transforms', () => {
  const artwork = {color:'brown',logo:'full',page:2,scale:65,x:12,y:-4,assetId:'abcd1234-1234-1234-1234-123456789abc',fileName:'card.pdf'};
  const draft = {version:2,expires:1100,card:'PVC',keychain:'PVC + epóxi',design:'customer',delivery:'pickup',city:'maputo',pickupPoint:'mahota',contact:'841234567',address:'',designInstructions:'',cardArtwork:artwork,pvcArtwork:{...artwork,page:1,x:-8}};
  const restored = readPurchaseDraft(JSON.stringify(draft),1000);
  assert.deepEqual(restored.cardArtwork,artwork);
  assert.equal(restored.pvcArtwork.page,1);
  assert.equal(restored.pvcArtwork.x,-8);
  assert.equal(readPurchaseDraft(JSON.stringify({...draft,cardArtwork:{...artwork,scale:200}}),1000),null);
});
