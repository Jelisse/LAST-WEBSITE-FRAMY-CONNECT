import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plans, getPlan, validatePlanContent } from '../lib/domain.ts';
import {
  transition,
  financials,
  validateProfile,
  publicProfile,
} from '../lib/domain.ts';
const base = () => ({
  id: 'test',
  productId: 'metal',
  productName: 'Metal',
  amount: 45000,
  cost: 12000,
  status: 'PENDING_PAYMENT',
  paid: false,
  refunded: false,
  qc: false,
  agent: '',
  proof: '',
  version: 1,
  createdAt: '2026-09-08',
  updatedAt: '2026-09-08',
  journal: [],
});
test('payment does not recognise revenue; delivery does, once', () => {
  let o = transition(base(), 'pay');
  assert.equal(financials([o]).revenue, 0);
  assert.equal(financials([o]).advances, 45000);
  assert.throws(() => transition(o, 'pay'));
  o = transition(o, 'assign', { agent: 'Agente Teste' });
  o = transition(o, 'start');
  assert.throws(() => transition(o, 'ready', { qc: false }));
  o = transition(o, 'ready', { qc: true });
  assert.throws(() => transition(o, 'deliver', { proof: '' }));
  o = transition(o, 'deliver', { proof: 'DEMO-001' });
  assert.equal(financials([o]).grossProfit, 33000);
  assert.equal(financials([o]).advances, 0);
  assert.throws(() => transition(o, 'deliver', { proof: 'DEMO-002' }));
  assert.equal(
    o.journal.reduce((n, j) => n + j.amount, 0),
    102000,
  );
});
test('unpaid/unassigned production is rejected', () => {
  assert.throws(() => transition(base(), 'start'));
  assert.throws(() => transition(transition(base(), 'pay'), 'start'));
});
test('paid cancellation requires separate refund without duplicate refund', () => {
  let o = transition(transition(base(), 'pay'), 'cancel');
  assert.equal(o.refunded, false);
  assert.equal(financials([o]).advances, 45000);
  o = transition(o, 'refund');
  assert.equal(financials([o]).providerBalance, 0);
  assert.equal(financials([o]).advances, 0);
  assert.throws(() => transition(o, 'refund'));
});
test('private fields never enter publication; unsafe links and reserved names rejected', () => {
  const p = {
    name: 'Ana Silva',
    username: 'ana_silva',
    title: 'Designer',
    email: 'ana@example.com',
    phone: '+258841234567',
    website: 'https://example.com',
    showEmail: false,
    showPhone: false,
  };
  const pub = publicProfile(validateProfile(p));
  assert.equal(pub.email, '');
  assert.equal(pub.phone, '');
  assert.equal(p.email, 'ana@example.com');
  assert.throws(() =>
    validateProfile({ ...p, website: 'javascript:alert(1)' }),
  );
  assert.throws(() => validateProfile({ ...p, username: 'dashboard' }));
  assert.throws(() =>
    validateProfile({ ...p, website: 'https://user:secret@example.com' }),
  );
});

test('five monthly plans enforce increasing link and biography allowances', () => {
  assert.deepEqual(
    plans.map((p) => p.dollars),
    [1, 3, 5, 9, 15],
  );
  for (const plan of plans) {
    assert.doesNotThrow(() =>
      validatePlanContent(
        {
          links: Array(plan.links).fill({
            label: 'Site',
            url: 'https://example.com',
          }),
          bio: 'x'.repeat(plan.bio),
        },
        plan.id,
      ),
    );
    assert.throws(() =>
      validatePlanContent(
        {
          links: Array(plan.links + 1).fill({
            label: 'Site',
            url: 'https://example.com',
          }),
        },
        plan.id,
      ),
    );
    assert.throws(() =>
      validatePlanContent({ bio: 'x'.repeat(plan.bio + 1) }, plan.id),
    );
  }
  assert.throws(() => getPlan('enterprise-free'));
});

test('profile links reject unsafe addresses and retain ordered labels', () => {
  const profile = {
    name: 'Test User',
    username: 'links_test',
    title: '',
    email: '',
    phone: '',
    website: '',
    showEmail: false,
    showPhone: false,
  };
  assert.deepEqual(validateProfile(profile).links, []);
  assert.equal(validateProfile(profile).bio, '');
  for (const url of [
    'javascript:alert(1)',
    'http://example.com',
    'https://u:p@example.com',
    'not a url',
  ]) {
    assert.throws(() =>
      validateProfile({ ...profile, links: [{ label: 'Site', url }] }),
    );
  }
  assert.throws(() =>
    validateProfile({
      ...profile,
      links: [{ label: ' ', url: 'https://example.com' }],
    }),
  );
  assert.throws(() =>
    validateProfile({
      ...profile,
      links: Array(51).fill({ label: 'Site', url: 'https://example.com' }),
    }),
  );
  const saved = validateProfile({
    ...profile,
    bio: 'Hello',
    links: [
      { label: ' First ', url: 'https://example.com/1' },
      { label: 'Second', url: 'https://example.com/2' },
    ],
  });
  assert.deepEqual(
    publicProfile(saved).links.map((link) => link.label),
    ['First', 'Second'],
  );
  assert.equal(publicProfile(saved).bio, 'Hello');
});
