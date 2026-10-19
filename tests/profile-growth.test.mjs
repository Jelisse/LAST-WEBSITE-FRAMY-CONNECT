import test from 'node:test';
import assert from 'node:assert/strict';
import { profileAccess, profileForAccess } from '../lib/entitlement.ts';
import {
  calendarMonthAfter,
  validateExtras,
  validateHostname,
} from '../lib/profile-growth.ts';
const now = Date.parse('2026-09-28T12:00:00Z');
test('Individual access remains free without expiry or deletion of saved links', () => {
  const m = {
    plan_id: 'free-30',
    trial_started_at: '2026-08-29T12:00:00Z',
    trial_expires_at: '2026-09-28T12:00:00Z',
    billing_enabled: 1,
  };
  assert.equal(profileAccess(m, now - 1), 'free');
  assert.equal(profileAccess(m, now), 'free');
  assert.equal(profileAccess(m, now + 7 * 86400000), 'free');
  assert.equal(
    profileAccess({ ...m, billing_enabled: 0 }, now + 40 * 86400000),
    'free',
  );
  const p = {
    name: 'Test',
    username: 'test',
    title: 'Hidden',
    bio: 'Hidden',
    email: 'private@example.com',
    phone: '',
    website: 'https://example.com',
    showEmail: false,
    showPhone: false,
    links: [
      { label: 'One', url: 'https://one.example' },
      { label: 'Two', url: 'https://two.example' },
    ],
    extras: {
      primaryContact: 'https://two.example',
      services: [],
      english: { title: 'Hidden EN', bio: '', hours: '' },
      enquiries: true,
      visibleLinks: null,
    },
  };
  const basic = profileForAccess(p, m, now + 8 * 86400000);
  assert.equal(basic.links.length, 2);
  assert.equal(basic.links[0].label, 'One');
  assert.equal(basic.email, '');
  assert.equal(basic.title, 'Hidden');
  assert.equal(basic.extras.enquiries, false);
  assert.equal(p.links.length, 2);
  const paid = {
    ...m,
    plan_id: 'personal',
    paid_started_at: '2026-09-01T00:00:00Z',
    paid_expires_at: '2026-10-01T00:00:00Z',
  };
  const personal = profileForAccess(
    { ...p, extras: { ...p.extras, visibleLinks: ['https://two.example'] } },
    paid,
    now,
  );
  assert.equal(personal.links.length, 1);
  assert.equal(personal.extras.english.title, '');
  assert.equal(
    personal.extras.visibleLinks,
    null,
    'private configuration not sent publicly',
  );
  assert.equal(
    profileAccess(
      { ...m, billing_opened_at: '2026-09-28T12:00:00Z' },
      now + 6 * 86400000,
    ),
    'free',
    'retired trials remain free even after billing opens',
  );
});
test('monthly renewal clamps month end and content/domain validation rejects unsafe input', () => {
  assert.equal(
    calendarMonthAfter('2026-01-31T12:00:00Z'),
    '2026-02-28T12:00:00.000Z',
  );
  assert.equal(
    calendarMonthAfter('2028-01-31T12:00:00Z'),
    '2028-02-29T12:00:00.000Z',
  );
  assert.throws(() =>
    validateExtras({
      services: [{ title: 'Offer', url: 'javascript:alert(1)' }],
    }),
  );
  assert.throws(() =>
    validateExtras({ services: Array(7).fill({ title: 'Offer' }) }),
  );
  for (const host of [
    'localhost',
    '127.0.0.1',
    'https://customer.com',
    'framyconnect.co.mz',
    'account.framyconnect.co.mz',
    'a.workers.dev',
    'a.local',
  ])
    assert.throws(() => validateHostname(host));
  assert.equal(
    validateHostname('Profile.Customer.co.mz'),
    'profile.customer.co.mz',
  );
});
