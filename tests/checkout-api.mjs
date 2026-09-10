import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = 'http://localhost:3000';
const sign = await fetch(base + '/signin-with-chatgpt?return_to=/', {
  redirect: 'manual',
});
const cookie = sign.headers.get('set-cookie').split(';')[0];
const headers = { cookie, origin: base, 'Content-Type': 'application/json' };
const d = await (await fetch(base + '/api/workspace', { headers })).json();
assert.ok(
  d.published && d.membership.version > 0,
  'Published profile fixture required',
);
const product = d.products.find((p) => p.available),
  plan = d.plans.find((p) => p.id === d.membership.planId),
  id = crypto.randomUUID();
await writeFile(
  'outputs/checkout-test-cleanup.sql',
  `DELETE FROM sandbox_events WHERE order_id='${id}'; DELETE FROM sandbox_orders WHERE id='${id}';`,
);
const body = {
  action: 'submit-order',
  checkout: true,
  id,
  productId: product.id,
  planId: plan.id,
  planVersion: plan.version,
  profileVersion: d.profileVersion,
  deliveryCity: 'Maputo',
  deliveryContact: '+258840000000',
};
const post = async (b) =>
  fetch(base + '/api/workspace', {
    method: 'POST',
    headers,
    body: JSON.stringify(b),
  });
assert.equal((await post({ ...body, profileVersion: -1 })).status, 409);
assert.equal((await post({ ...body, planVersion: -1 })).status, 409);
assert.equal((await post({ ...body, deliveryContact: '' })).status, 422);
assert.equal((await post(body)).status, 200);
assert.equal((await post(body)).status, 200);
const next = await (await fetch(base + '/api/workspace', { headers })).json();
const order = next.orders.find((o) => o.id === id);
assert.equal(order.checkoutPlan.id, plan.id);
assert.equal(order.approvedProfileVersion, d.profileVersion);
assert.equal(order.profileUsername, d.profile.username);
assert.equal(order.deliveryContact, body.deliveryContact);
assert.equal(order.status, 'PENDING_PAYMENT');
assert.equal(order.paid, false);
assert.equal(
  next.profileVersion,
  d.profileVersion,
  'Checkout must not overwrite the profile',
);
console.log(
  'PASS: checkout links approved profile, plan and delivery; rejects stale approval and retries without duplicates.',
);
