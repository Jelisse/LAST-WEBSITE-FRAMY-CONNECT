import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = 'http://localhost:3000';
const sign = await fetch(base + '/signin-with-chatgpt?return_to=/manager', {
  redirect: 'manual',
});
const cookie = sign.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
const headers = { cookie, origin: base, 'Content-Type': 'application/json' };
const request = async (path, body, extra = {}) => {
  const r = await fetch(
    base + path,
    body
      ? {
          method: path === '/api/manage-products' ? 'PUT' : 'POST',
          headers: { ...headers, ...extra },
          body: JSON.stringify(body),
        }
      : { headers },
  );
  const text = await r.text();
  let d;
  try {
    d = JSON.parse(text);
  } catch {
    d = { error: text.slice(0, 180) };
  }
  return { status: r.status, data: d };
};
const initial = await request('/api/manager');
assert.equal(initial.status, 200, JSON.stringify(initial.data));
assert.ok([401, 403].includes((await fetch(base + '/api/manager')).status));
assert.equal(
  (
    await request(
      '/api/manager',
      { action: 'stock' },
      { origin: 'https://evil.example' },
    )
  ).status,
  403,
);
const suffix = crypto.randomUUID(),
  productId = 'qa-' + suffix,
  agentId = 'agent-' + suffix,
  planId = 'plan-' + suffix,
  orderId = crypto.randomUUID();
const sql = `DELETE FROM sandbox_events WHERE order_id='${orderId}'; DELETE FROM sandbox_orders WHERE id='${orderId}'; DELETE FROM stock_movements WHERE product_id='${productId}'; DELETE FROM product_catalog WHERE id='${productId}'; DELETE FROM manager_records WHERE id IN ('${agentId}','${planId}'); DELETE FROM manager_audit WHERE subject LIKE '%${suffix}%' OR subject='${orderId}';`;
await writeFile('outputs/manager-test-cleanup.sql', sql);
const product = {
  ...initial.data.products[0],
  id: productId,
  name: 'QA ' + suffix,
  amount: 10000,
  cost: 4000,
  version: 0,
  available: true,
};
assert.equal((await request('/api/manage-products', product)).status, 200);
assert.ok(
  (await request('/api/products')).data.products.some(
    (p) => p.id === productId,
  ),
);
assert.equal(
  (
    await request(
      '/api/workspace',
      { action: 'create-order', id: orderId, productId },
      { 'X-Framy-Order-Management': 'true' },
    )
  ).status,
  200,
);
let o = (await request('/api/manager')).data.orders.find(
  (o) => o.id === orderId,
);
const step = async (step, extra = {}) =>
  request('/api/manager', {
    action: 'order',
    orderId,
    version: o.version,
    step,
    ...extra,
  });
assert.equal((await step('pay')).status, 409, 'No stock prevents reservation');
assert.equal(
  (
    await request('/api/manager', {
      action: 'stock',
      id: crypto.randomUUID(),
      productId,
      quantity: 1,
      reason: 'QA ' + suffix,
    })
  ).status,
  200,
);
assert.equal((await step('pay')).status, 200);
o = (await request('/api/manager')).data.orders.find((o) => o.id === orderId);
assert.equal(
  (
    await request('/api/manager', {
      action: 'stock',
      id: crypto.randomUUID(),
      productId,
      quantity: -1,
      reason: 'QA ' + suffix,
    })
  ).status,
  409,
  'Reserved stock cannot be removed',
);
assert.equal((await step('assign', { agentId: 'missing' })).status, 422);
const agent = {
  action: 'agent',
  id: agentId,
  name: 'QA ' + suffix,
  email: 'qa@example.com',
  phone: '',
  active: true,
  version: 0,
};
assert.equal((await request('/api/manager', agent)).status, 200);
assert.equal(
  (await request('/api/manager', agent)).status,
  409,
  'Stale agent edit blocked',
);
assert.equal((await step('assign', { agentId })).status, 200);
for (const [s, extra] of [
  ['start', {}],
  ['ready', { qc: true }],
  ['deliver', { proof: 'QA delivery ' + suffix }],
]) {
  o = (await request('/api/manager')).data.orders.find((o) => o.id === orderId);
  assert.equal((await step(s, extra)).status, 200, s);
}
const done = (await request('/api/manager')).data;
assert.equal(done.orders.find((o) => o.id === orderId).status, 'DELIVERED');
assert.equal(
  done.movements
    .filter((m) => m.product_id === productId)
    .reduce((n, m) => n + m.quantity, 0),
  0,
  'Delivery consumes stock once',
);
assert.equal((await step('deliver', { proof: 'repeat' })).status, 409);
assert.ok(
  (await request('/api/workspace')).data.events.some(
    (e) => e.orderId === orderId && e.action === 'deliver',
  ),
  'Customer timeline receives manager updates',
);
const plan = {
  action: 'plan',
  id: planId,
  name: 'QA ' + suffix,
  audience: 'QA',
  description: 'Test',
  dollars: 2.5,
  links: 8,
  bio: 100,
  active: true,
  version: 0,
};
assert.equal((await request('/api/manager', plan)).status, 200);
assert.ok(
  (await request('/api/workspace')).data.plans.some(
    (p) => p.id === planId && p.dollars === 2.5,
  ),
);
assert.equal(
  (await request('/api/manager', { ...plan, version: 1, active: false }))
    .status,
  200,
);
assert.ok(
  !(await request('/api/workspace')).data.plans.some((p) => p.id === planId),
);
console.log(
  'PASS: Manager access, CSRF, product creation, agent versioning, stock reservations, complete order flow, customer timeline and dynamic plans.',
);
