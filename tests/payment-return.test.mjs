import test from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination } from '../lib/auth-policy.ts';
import { customerOrder } from '../lib/customer-order.ts';
test('payment return survives customer sign-in without enabling external or staff redirects', () => {
  for (const path of ['/pagamento/retorno', '/pagamento/retorno?order=abc-123']) assert.equal(loginDestination('customer', path), path);
  for (const path of ['//evil.test', '/pagamento/retorno?next=https://evil.test']) assert.equal(loginDestination('customer', path), '/dashboard');
  assert.equal(loginDestination('agent', '/pagamento/retorno'), '/agent');
});
test('customer order exposes only explicit contact and excludes agent records and payment evidence', () => {
  const result = customerOrder({id:'order', agentId:'private-id', paymentReference:'private', agent:'Agent', internalNotes:'secret'}, {name:'Agent', phone:'+258840000000'});
  assert.deepEqual(result.agentContact, {name:'Agent', phone:'+258840000000'});
  assert.equal(result.agentId, undefined);
  assert.equal(result.paymentReference, undefined);
  assert.equal(result.internalNotes, undefined);
});
