import assert from 'node:assert/strict';
const base = 'http://localhost:3000';
const auth = await fetch(base + '/signin-with-chatgpt?return_to=/dashboard', {
  redirect: 'manual',
});
const cookie = auth.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
const get = () =>
  fetch(base + '/api/workspace', { headers: { cookie } }).then((r) => r.json());
const before = await get();
assert.ok(Array.isArray(before.orders));
for (const action of [
  'create-order',
  'pay',
  'assign',
  'start',
  'ready',
  'deliver',
  'cancel',
  'refund',
]) {
  for (const management of [false, true]) {
    if (management && before.canManageOrders) continue;
    const response = await fetch(base + '/api/workspace', {
      method: 'POST',
      headers: {
        cookie,
        origin: base,
        'Content-Type': 'application/json',
        ...(management ? { 'X-Framy-Order-Management': 'true' } : {}),
      },
      body: JSON.stringify({
        action,
        id: crypto.randomUUID(),
        productId: 'metal',
        orderId: before.orders[0]?.id ?? 'test',
        version: before.orders[0]?.version ?? 1,
        agent: 'Unauthorized',
        qc: true,
        proof: 'Unauthorized',
      }),
    });
    assert.equal(response.status, 403, action + ' must be blocked');
  }
}
assert.deepEqual(
  (await get()).orders,
  before.orders,
  'blocked requests must not change orders',
);
console.log(
  'Customer order mutations blocked; orders unchanged. Manager role:',
  before.canManageOrders,
);
