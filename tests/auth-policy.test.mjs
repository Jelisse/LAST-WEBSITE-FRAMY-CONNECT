import test from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination, dashboardFor } from '../lib/auth-policy.ts';
test('staff always enter their own dashboard', () => {
  for (const role of ['manager', 'agent', 'director'])
    for (const path of [
      '/dashboard',
      '/manager',
      '//evil.test',
      'https://evil.test',
      '/encomendar/keychain',
    ])
      assert.equal(loginDestination(role, path), dashboardFor(role));
});
test('customer purchase resumes but privileged and external paths do not', () => {
  assert.equal(
    loginDestination('customer', '/encomendar/keychain'),
    '/encomendar/keychain',
  );
  for (const path of [
    '/manager',
    '/finance',
    '/cofounder',
    '//evil.test',
    '/\\evil.test',
    'https://evil.test',
  ])
    assert.equal(loginDestination('customer', path), '/dashboard');
});
