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

test('Corporate setup is an exact safe return path for customers and agents',()=>{for(const role of ['customer','agent']){assert.equal(loginDestination(role,'/corporativo/configurar'),'/corporativo/configurar');assert.notEqual(loginDestination(role,'/corporativo/configurar?redirect=https://evil.test'),'/corporativo/configurar?redirect=https://evil.test');}});

test('guest tracking returns to the exact reference after login without permitting external redirects',()=>{
 const id='a'.repeat(32);assert.equal(loginDestination('customer','/acompanhar?referencia='+id),'/acompanhar?referencia='+id);assert.equal(loginDestination('agent','/acompanhar?referencia='+id),'/acompanhar?referencia='+id);
 for(const path of ['/acompanhar?referencia='+id+'&next=https://evil.invalid','//evil.invalid/acompanhar','/acompanhar?referencia=invalid'])assert.equal(loginDestination('customer',path),'/dashboard');
});


test('branded tracking references survive login but additional redirects remain blocked',()=>{
 for(const code of ['OR','PY']) { const path='/acompanhar?referencia=FC-'+code+'-26-5827-4193'; assert.equal(loginDestination('customer',path),path);assert.equal(loginDestination('customer',path+'&next=https://evil.invalid'),'/dashboard'); }
});
