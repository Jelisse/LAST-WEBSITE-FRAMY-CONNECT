import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateBusiness,
  profileColorHex,
  profileColorIsLight,
  whatsappURL,
  directionsURL,
} from '../lib/profile-business.ts';
import { hasActiveTrial, hasProfileAccess } from '../lib/entitlement.ts';
void test('business contact data validates international numbers and limits and encodes outgoing messages', () => {
  const b = validateBusiness({
    whatsapp: '+258 84 000 0000',
    message: 'Olá & obrigado?',
    address: 'Maputo & Matola',
    hours: '08–17',
    accent: 'green',
    layout: 'compact',
  });
  assert.equal(b.whatsapp, '+258840000000');
  assert.equal(
    new URL(whatsappURL(b)).searchParams.get('text'),
    'Olá & obrigado?',
  );
  assert.equal(
    new URL(directionsURL(b.address)).searchParams.get('query'),
    b.address,
  );
  for (const invalid of [
    { whatsapp: '840000000' },
    { accent: 'url(javascript:alert(1))' },
    { message: 'a'.repeat(301) },
    { hours: 'test\u0000' },
  ])
    assert.throws(() => validateBusiness(invalid));
  assert.equal(whatsappURL(validateBusiness(undefined)), null);
});
void test('launch protection preserves access without rewriting or restarting trial dates', () => {
  const member = {
    plan_id: 'free-30',
    trial_started_at: '2020-01-01T00:00:00Z',
    trial_expires_at: '2020-01-31T00:00:00Z',
  };
  const snapshot = JSON.stringify(member);
  assert.equal(hasActiveTrial(member), false);
  assert.equal(hasProfileAccess(member), true);
  assert.equal(JSON.stringify(member), snapshot);
  assert.equal(hasProfileAccess(null), false);
  assert.equal(hasProfileAccess({ ...member, plan_id: 'personal' }), false);
  assert.equal(
    hasProfileAccess({ ...member, trial_expires_at: 'invalid' }),
    false,
  );
  assert.equal(
    hasProfileAccess({ ...member, trial_expires_at: '2019-01-01' }),
    false,
  );
  assert.equal(
    hasProfileAccess({ ...member, trial_expires_at: '2021-01-01' }),
    false,
  );
  assert.equal(
    hasProfileAccess({
      ...member,
      trial_started_at: '2090-01-01',
      trial_expires_at: '2090-01-31',
    }),
    false,
  );
});

void test('neutral profile colours survive validation alongside existing saved colours', () => {
  for (const accent of [
    'orange',
    'white',
    'blue',
    'green',
    'plum',
    'slate',
    'black',
  ]) {
    assert.equal(validateBusiness({ accent }).accent, accent);
  }
  assert.equal(validateBusiness(undefined).accent, 'orange');
  assert.equal(validateBusiness({ accent: '#ffffff' }).accent, '#ffffff');
});

void test('custom colours validate safely and choose readable text for bright and dark shades', () => {
  for (const accent of ['#Ab12Cd', '#ffff00', '#ffffff', '#000000']) {
    assert.equal(validateBusiness({ accent }).accent, accent);
    assert.equal(profileColorHex(accent), accent.toLowerCase());
  }
  for (const accent of [
    '#fff',
    '#12345678',
    'red',
    'url(test)',
    '#12345g',
    null,
  ]) {
    if (accent !== null) assert.throws(() => validateBusiness({ accent }));
    assert.equal(profileColorHex(accent), '#b83c0a');
  }
  assert.equal(profileColorIsLight('#ffff00'), true);
  assert.equal(profileColorIsLight('#aaffcc'), true);
  assert.equal(profileColorIsLight('white'), true);
  assert.equal(profileColorIsLight('black'), false);
  assert.equal(profileColorIsLight('#100050'), false);
  assert.equal(profileColorIsLight('orange'), false);
});
