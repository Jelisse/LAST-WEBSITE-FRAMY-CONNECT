import test from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination, dashboardFor, accountDestination } from '../lib/auth-policy.ts';

test('only new personal account journeys enter focused onboarding, preserving purchase and company returns', () => {
  for (const path of ['', '/dashboard', '/perfil', '/perfil?plans=1']) assert.equal(accountDestination('customer',path,true),'/perfil?onboarding=1');
  assert.equal(accountDestination('customer','/dashboard',false),'/dashboard');
  for (const path of ['/comprar?formato=keychain','/checkout/retorno?payment=abc123','/corporativo/configurar','/corporativo/aceitar','/aplicar']) assert.equal(accountDestination('customer',path,true),path);
  assert.equal(accountDestination('manager','/perfil',true),'/manager');
  assert.equal(accountDestination('customer','//evil.test',true),'/perfil?onboarding=1');
});
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


test('plan-specific entry preserves Professional billing and corporate offers through authentication', () => {
  assert.equal(loginDestination('customer', '/perfil?billing=1'), '/perfil?billing=1');
  assert.equal(accountDestination('customer', '/perfil?billing=1', true), '/perfil?onboarding=1&plan=professional-v2');
  assert.equal(accountDestination('customer', '/perfil?billing=1', false), '/perfil?billing=1');
  for (const offer of ['business', 'enterprise']) {
    const path = '/corporativo/configurar?offer=' + offer;
    assert.equal(accountDestination('customer', path, true), path);
  }
  for (const path of ['/perfil?billing=1&next=https://evil.test', '/perfil?onboarding=1&plan=admin'])
    assert.equal(loginDestination('customer', path), '/dashboard');
});
