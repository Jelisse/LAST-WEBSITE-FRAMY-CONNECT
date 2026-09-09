import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const base = 'http://localhost:3000';
const anonymous = await fetch(base + '/api/workspace', {
  headers: {
    'oai-authenticated-user-id': 'forged',
    'oai-authenticated-user-email': 'forged@example.com',
  },
});
assert.equal(
  anonymous.status,
  401,
  'anonymous/spoofed headers must not authenticate',
);
const signin = await fetch(base + '/signin-with-chatgpt?return_to=/dashboard', {
  redirect: 'manual',
});
assert.equal(signin.status, 302);
const cookie = signin.headers.get('set-cookie').split(';')[0];
const headers = {
  cookie,
  origin: base,
  'Content-Type': 'application/json',
  'X-Framy-Order-Management': 'true',
};
const api = async (body) => {
  const response = await fetch(base + '/api/workspace', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
};
const get = async () => {
  const r = await fetch(base + '/api/workspace', { headers: { cookie } });
  assert.equal(r.status, 200);
  return r.json();
};
const cross = await fetch(base + '/api/workspace', {
  method: 'POST',
  headers: { ...headers, origin: 'https://untrusted.example' },
  body: '{}',
});
assert.equal(cross.status, 403);
const id = randomUUID();
assert.equal(
  (await api({ action: 'create-order', id, productId: 'metal' })).status,
  200,
);
assert.equal(
  (await api({ action: 'create-order', id, productId: 'metal' })).status,
  200,
);
assert.equal(
  (await api({ action: 'create-order', id, productId: 'keychain' })).status,
  409,
  'same key with a changed product must conflict',
);
let data = await get();
assert.equal(data.orders.filter((o) => o.id === id).length, 1);
let o = data.orders.find((o) => o.id === id);
assert.equal(
  (await api({ action: 'start', orderId: id, version: o.version })).status,
  422,
);
for (const [action, extra] of [
  ['pay', {}],
  ['assign', { agent: 'Agente de teste automatizado' }],
  ['start', {}],
  ['ready', { qc: true }],
  ['deliver', { proof: 'TESTE-AUTOMATICO-SEM-ENTREGA-REAL' }],
]) {
  assert.equal(
    (await api({ action, orderId: id, version: o.version, ...extra })).status,
    200,
    action,
  );
  data = await get();
  o = data.orders.find((o) => o.id === id);
}
assert.equal(o.status, 'DELIVERED');
assert.equal(o.journal.length, 3);
assert.equal(
  (
    await api({
      action: 'deliver',
      orderId: id,
      version: 1,
      proof: 'duplicate',
    })
  ).status,
  409,
);
const unknown = await api({ action: 'pay', orderId: randomUUID(), version: 1 });
assert.equal(unknown.status, 404);
if (!data.profile) {
  const profile = {
    name: 'Perfil de Teste',
    username: 'teste_' + randomUUID().slice(0, 8),
    title: 'Teste automatizado',
    email: 'private-check@example.com',
    phone: '+258849999999',
    website: 'https://example.com',
    showEmail: false,
    showPhone: false,
  };
  assert.equal(
    (await api({ action: 'publish-profile', profile, version: 0 })).status,
    200,
  );
  const pub = await fetch(base + '/' + profile.username, {
    headers: { cookie },
  });
  assert.equal(pub.status, 200);
  const html = await pub.text();
  assert.ok(!html.includes('private-check@example.com'));
  assert.ok(!html.includes('+258849999999'));
  const d = await get();
  assert.equal(
    (
      await api({
        action: 'unpublish-profile',
        profile,
        version: d.profileVersion,
      })
    ).status,
    200,
  );
  const hidden = await fetch(base + '/' + profile.username, {
    headers: { cookie },
  });
  assert.equal(hidden.status, 404);
}
for (const route of [
  '/',
  '/produtos',
  '/produtos/metal',
  '/sobre',
  '/contacto',
  '/ajuda',
  '/dashboard',
  '/operations',
  '/cofounder',
  '/agent',
]) {
  const response = await fetch(base + route, { headers: { cookie } });
  assert.equal(response.status, 200, route);
}
console.log(
  'PASS: anonymous access, spoofed headers, CSRF, durable order lifecycle, idempotent creation, stale updates, publication privacy, unpublication and 10 routes.',
);
