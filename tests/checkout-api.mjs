import assert from 'node:assert/strict';
const base = process.env.FRAMY_TEST_URL ?? 'http://localhost:3017';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw Error(
    'This fixture writes test orders. Use an isolated local server only.',
  );
const suffix = crypto.randomUUID();
async function post(path, body, cookie = '') {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { origin: base, 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Error(`${path}: ${r.status} ${text.slice(0, 200)}`);
  }
  return { r, data };
}
async function login(email, password, register = false) {
  const { r, data } = await post('/api/auth', {
    action: register ? 'register' : 'login',
    email,
    password,
    name: 'Cliente QA',
  });
  assert.equal(r.status, 200, JSON.stringify(data));
  return r.headers.get('set-cookie').split(';')[0];
}
const get = async (path, cookie) => {
  const r = await fetch(base + path, {
    headers: { cookie },
    cache: 'no-store',
  });
  assert.equal(r.status, 200, path);
  return r.json();
};
const cookie = await login(
  `qa-${suffix}@example.com`,
  'Cliente-QA-seguro-2026',
  true,
);
const profile = {
  name: 'Cliente QA',
  username: 'qa_' + suffix.replaceAll('-', '').slice(0, 20),
  title: '',
  email: 'qa@example.com',
  phone: '',
  website: '',
  showEmail: false,
  showPhone: false,
  links: [],
  bio: '',
  photoUrl: '',
  photoPosition: 35,
};
assert.equal(
  (
    await post(
      '/api/workspace',
      { action: 'publish-profile', profile, version: 0 },
      cookie,
    )
  ).r.status,
  403,
);
assert.equal(
  (
    await post(
      '/api/workspace',
      { action: 'save-profile', profile, version: 0 },
      cookie,
    )
  ).r.status,
  200,
);
assert.equal(
  (
    await post(
      '/api/workspace',
      {
        action: 'activate-sandbox-plan',
        planId: 'free-30',
        planVersion: 0,
        version: 0,
      },
      cookie,
    )
  ).r.status,
  200,
);
const id = crypto.randomUUID();
const body = {
  action: 'submit-order',
  checkout: true,
  approveProfile: true,
  id,
  productId: 'keychain',
  planId: 'free-30',
  planVersion: 0,
  profileVersion: 1,
  design: { optionId: 'tiktok' },
  deliveryCity: 'Maputo',
  deliveryAddress: 'Teste isolado',
  deliveryContact: '+258840000000',
};
let result = await post('/api/workspace', body, cookie);
assert.equal(result.r.status, 200, JSON.stringify(result.data));
assert.equal((await post('/api/workspace', body, cookie)).r.status, 200);
assert.equal(
  (await post('/api/workspace', { ...body, deliveryCity: 'Matola' }, cookie)).r
    .status,
  409,
);
let data = await get('/api/workspace', cookie);
const order = data.orders.find((o) => o.id === id);
assert.ok(order);
assert.equal(order.status, 'PENDING_PAYMENT');
assert.equal('cost' in order, false);
assert.equal('journal' in order, false);
const payment = await get('/api/payments?order=' + id, cookie);
assert.match(payment.url, /^https:\/\/pay.opsellio.com\//);
assert.equal(payment.amount, 50000);
const page = await fetch(base + '/' + profile.username);
assert.equal(page.status, 200);
assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
assert.match(page.headers.get('content-security-policy'), /frame-ancestors/);
assert.equal(
  (
    await post(
      '/api/manager',
      { action: 'order', step: 'pay', orderId: id, version: 1 },
      cookie,
    )
  ).r.status,
  403,
);
const manager = await login('gestor@qa.example', 'Framy-QA-2026-only!');
result = await post(
  '/api/accounts',
  {
    action: 'create',
    role: 'agent',
    name: 'Agente QA',
    email: `agente-${suffix}@example.com`,
  },
  manager,
);
assert.equal(result.r.status, 200, JSON.stringify(result.data));
const token = new URL(result.data.invitationUrl).hash.slice(1);
assert.equal(
  (await post('/api/activate', { token, password: 'Agente-QA-seguro-2026' })).r
    .status,
  200,
);
assert.equal(
  (await post('/api/activate', { token, password: 'Agente-QA-seguro-2026' })).r
    .status,
  410,
);
const agentCookie = await login(
  `agente-${suffix}@example.com`,
  'Agente-QA-seguro-2026',
);
const accounts = await get('/api/accounts', manager);
const agent = accounts.accounts.find(
  (a) => a.email === `agente-${suffix}@example.com`,
);
assert.equal(
  (
    await post(
      '/api/manager',
      { action: 'order', step: 'pay', orderId: id, version: 1 },
      manager,
    )
  ).r.status,
  422,
);
result = await post(
  '/api/manager',
  {
    action: 'order',
    step: 'pay',
    orderId: id,
    version: 1,
    paymentReference: 'QA-' + suffix,
    verifiedAmount: 50000,
    currency: 'MZN',
    verifiedInProvider: true,
  },
  manager,
);
assert.equal(result.r.status, 200, JSON.stringify(result.data));
result = await post(
  '/api/manager',
  {
    action: 'order',
    step: 'assign',
    orderId: id,
    version: 2,
    agentId: agent.id,
  },
  manager,
);
assert.equal(result.r.status, 200, JSON.stringify(result.data));
let version = 3;
for (const [step, fields] of [
  ['start', {}],
  ['program', { verifiedUrl: base + '/' + profile.username, tested: true }],
  [
    'ready',
    { quality: { nfc: true, customer: true, print: true, condition: true } },
  ],
  ['package', { packaged: true }],
  ['dispatch', { courier: 'Entrega de teste', tracking: 'QA-TRACK' }],
  [
    'deliver',
    { proof: 'Recepcao de teste confirmada', customerConfirmed: true },
  ],
]) {
  result = await post(
    '/api/agent',
    { action: 'order', step, orderId: id, version, ...fields },
    agentCookie,
  );
  assert.equal(result.r.status, 200, JSON.stringify(result.data));
  version++;
}
data = await get('/api/workspace', cookie);
assert.equal(data.orders.find((o) => o.id === id).status, 'DELIVERED');
assert.equal(
  (
    await post(
      '/api/accounts',
      {
        action: 'update',
        id: agent.id,
        role: 'agent',
        active: 0,
        version: agent.version,
      },
      manager,
    )
  ).r.status,
  200,
);
assert.equal(
  (await fetch(base + '/api/agent', { headers: { cookie: agentCookie } }))
    .status,
  403,
);
console.log(
  'PASS: real local HTTP authentication, private payloads, atomic checkout, payment evidence, staff invitation, NFC/quality/dispatch/delivery and session revocation.',
);
