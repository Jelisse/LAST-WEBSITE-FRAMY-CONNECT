import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile, publicProfile } from '../lib/domain.ts';
import { portraitShapes, portraitPatterns, portraitMask, portraitPath } from '../lib/portrait-design.ts';
const base = { name: 'Ana Silva', username: 'ana_silva', title: 'Designer', email: 'ana@example.com', phone: '+258841234567', website: '', showEmail: false, showPhone: false };
test('portrait customisation survives validation and publication for every shape and pattern', () => {
  for (const photoShape of portraitShapes) for (const photoPattern of portraitPatterns) {
    const design = { photoShape, photoPattern, photoPatternColor: '#fedcba', photoPatternScale: 150, photoPatternStrength: 65, photoHeadEscape: false, photoGlowStrength: 0, photoOutlineColor: '#123456', photoOutlineWidth: 12 };
    const result = publicProfile(validateProfile({ ...base, ...design }));
    for (const [key, value] of Object.entries(design)) assert.equal(result[key], value);
    assert.equal(result.email, '');
  }
});
test('invalid portrait choices, colours and slider values are rejected', () => {
  for (const invalid of [{ photoShape: 'triangle' }, { photoPattern: 'injected' }, { photoPatternColor: 'url(javascript:1)' }, { photoPatternScale: 49 }, { photoPatternScale: 201 }, { photoPatternStrength: 101 }, { photoGlowStrength: -1 }, { photoHeadEscape: 'true' }, { photoPatternScale: NaN }, { photoOutlineWidth: -1 }, { photoOutlineWidth: 21 }, { photoOutlineWidth: '3' }, { photoOutlineWidth: Infinity }, { photoOutlineColor: 'red' }]) assert.throws(() => validateProfile({ ...base, ...invalid }));
});
test('portrait masks retain their frame and extend only the upper area for cutouts', () => {
  assert.equal(portraitPath(), portraitPath('framy'));
  for (const shape of portraitShapes) {
    const decode = mask => decodeURIComponent(mask);
    assert.ok(decode(portraitMask(shape)).includes(portraitPath(shape)));
    assert.ok(!decode(portraitMask(shape)).includes('M0 0H420V180H0Z'));
    assert.ok(decode(portraitMask(shape, true)).includes('M0 0H420V180H0Z'));
  }
});

test('outline can be hidden and legacy profiles keep the default outline', () => {
  assert.equal(validateProfile({ ...base, photoOutlineWidth: 0 }).photoOutlineWidth, 0);
  assert.equal(validateProfile(base).photoOutlineWidth, undefined);
});
