import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateDesign } from '../lib/customisation.ts';
const keychain = { id: 'keychain', category: 'Acessórios' },
  card = { id: 'pvc', category: 'Cartões' };
const art = {
  assetId: '12345678-1234-1234-1234-123456789012',
  fileKey: 'local',
  name: 'art.pdf',
  page: 1,
  scale: 80,
  x: 0,
  y: 0,
};
test('accepts the three stock models and rejects invented options', () => {
  for (const optionId of ['tiktok', 'pattern', 'instagram'])
    assert.deepEqual(validateDesign({ optionId }, keychain), { optionId });
  assert.throws(() => validateDesign({ optionId: 'other' }, keychain));
});
test('custom keychains require a front file and prohibit custom backs', () => {
  assert.throws(() => validateDesign({ optionId: 'blank-keychain' }, keychain));
  assert.throws(() =>
    validateDesign(
      { optionId: 'blank-keychain', front: art, back: art },
      keychain,
    ),
  );
  assert.ok(
    validateDesign({ optionId: 'blank-keychain', front: art }, keychain).front,
  );
});
test('cards allow both faces but do not trust client QR or identity', () => {
  const d = validateDesign(
    {
      optionId: 'blank-card',
      front: art,
      back: art,
      profileUrl: 'https://wrong.example',
      holderName: 'Spoofed',
    },
    card,
  );
  assert.ok(d.front && d.back);
  assert.equal(d.profileUrl, undefined);
  assert.equal(d.holderName, undefined);
});
test('rejects invalid original file references and print transforms', () => {
  for (const patch of [
    { assetId: '../other' },
    { page: 0 },
    { scale: 151 },
    { x: Infinity },
    { y: -41 },
  ])
    assert.throws(() =>
      validateDesign(
        { optionId: 'blank-keychain', front: { ...art, ...patch } },
        keychain,
      ),
    );
});
