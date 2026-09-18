import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const moduleURL = (code) =>
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const modules = new Map();
function loadModule(name) {
  const file = resolve(root, name);
  if (modules.has(file)) return modules.get(file);
  const mocks = {
    '@/app/chatgpt-auth': moduleURL(
      'export async function getChatGPTUser(){return globalThis.__launch.user;}',
    ),
    'cloudflare:workers': moduleURL(
      'export const env=new Proxy({}, {get:(_,key)=>globalThis.__launch.env[key]});',
    ),
    'next/headers': moduleURL(
      'export async function cookies(){return {get:()=>({value:globalThis.__launch.cookie})};}',
    ),
  };
  let code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  code = code.replace(/from ['"]([^'"]+)['"]/g, (whole, id) => {
    if (mocks[id]) return `from '${mocks[id]}'`;
    if (id === 'bcryptjs')
      return `from '${pathToFileURL(resolve(root, 'node_modules/bcryptjs/index.js')).href}'`;
    const target = id.startsWith('@/')
      ? resolve(root, id.slice(2))
      : id.startsWith('.')
        ? resolve(dirname(file), id)
        : null;
    return target
      ? `from '${loadModule(target.endsWith('.ts') ? target : target + '.ts')}'`
      : whole;
  });
  const result = moduleURL(code);
  modules.set(file, result);
  return result;
}
const api = async (file) => import(loadModule(file));
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const f of readdirSync(resolve(root, 'drizzle'))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(readFileSync(resolve(root, 'drizzle', f), 'utf8'));
  const db = {
    prepare(query) {
      let args = [];
      const stmt = {
        bind(...values) {
          args = values;
          return stmt;
        },
        async first() {
          return sql.prepare(query).get(...args) ?? null;
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
        },
        async run() {
          return {
            meta: { changes: Number(sql.prepare(query).run(...args).changes) },
          };
        },
      };
      return stmt;
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sql.exec('COMMIT');
        return results;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  for (const [id, role] of [
    ['customer-a', 'customer'],
    ['customer-b', 'customer'],
    ['manager-a', 'manager'],
    ['manager-b', 'manager'],
    ['director-a', 'director'],
    ['agent-a', 'agent'],
  ])
    sql
      .prepare(
        'INSERT INTO auth_accounts(id,email,name,password_hash,role,active,created_at) VALUES(?,?,?,?,?,1,?)',
      )
      .run(
        id,
        id + '@example.com',
        id,
        '!test',
        role,
        new Date().toISOString(),
      );
  sql
    .prepare(
      "INSERT INTO manager_records(id,kind,data_json,version,updated_at) VALUES('agent-a','agent',?,1,?)",
    )
    .run(
      JSON.stringify({
        name: 'Agent A',
        email: 'agent-a@example.com',
        active: true,
      }),
      new Date().toISOString(),
    );
  sql
    .prepare(
      'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at) VALUES(?,?,?,?,?,?)',
    )
    .run(
      'fixture-stock',
      'keychain',
      20,
      'Test stock',
      'manager-a',
      new Date().toISOString(),
    );
  globalThis.__launch = {
    user: { userId: 'customer-a', role: 'customer', displayName: 'Customer' },
    env: {
      DB: db,
      PROFILE_PHOTOS: {
        async head() {
          return {
            customMetadata: { ownerId: globalThis.__launch.user.userId },
          };
        },
      },
    },
  };
  return sql;
}
const origin = 'https://framy.example';
const request = (body) =>
  new Request(origin + '/api/test', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const post = async (route, body) => {
  const response = await route.POST(request(body));
  return { status: response.status, body: await response.json() };
};

test('catalogue: only keychains sell initially, stock count runs once, managers control publication and galleries', async () => {
  const sql = fixture();
  const catalog = await api('lib/server-catalog.ts');
  const manage = await api('app/api/manage-products/route.ts');
  const publicApi = await api('app/api/products/route.ts');
  let products = await catalog.getProducts();
  assert.equal(products[0].id, 'keychain');
  assert.deepEqual(
    products.filter((p) => p.available).map((p) => p.id),
    ['keychain'],
  );
  assert.equal(
    sql
      .prepare(
        "SELECT SUM(quantity) n FROM stock_movements WHERE product_id='keychain'",
      )
      .get().n,
    500,
  );
  sql.exec(
    "INSERT INTO stock_movements VALUES('test-sale','keychain',-1,'test','test','2026-09-18','')",
  );
  await catalog.getProducts();
  assert.equal(
    sql
      .prepare(
        "SELECT SUM(quantity) n FROM stock_movements WHERE product_id='keychain'",
      )
      .get().n,
    499,
  );
  let p = products.find((p) => p.id === 'metal');
  assert.equal(
    (await manage.PUT(request({ ...p, available: true }))).status,
    403,
  );
  globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
  let r = await manage.PUT(
    request({
      ...p,
      available: true,
      published: true,
      images: [p.imageUrl, '/products/pvc.png'],
    }),
  );
  assert.equal(r.status, 200);
  p = (await r.json()).product;
  assert.equal(
    (await catalog.getProducts()).find((v) => v.id === 'metal').available,
    true,
  );
  r = await manage.PUT(request({ ...p, published: false }));
  assert.equal(r.status, 200);
  assert.equal(
    (await (await publicApi.GET()).json()).products.some(
      (v) => v.id === 'metal',
    ),
    false,
  );
  assert.equal(
    (await (await publicApi.GET()).json()).products.find((v) => v.id === 'pvc')
      .amount,
    0,
  );
  assert.equal(
    (
      await manage.PUT(
        request({ ...p, images: ['https://evil.test/photo.jpg'] }),
      )
    ).status,
    422,
  );
  sql.close();
});

test('product analytics count non-buyers once per session/day and exclude staff and hidden products', async () => {
  const sql = fixture(),
    route = await api('app/api/product-visits/route.ts');
  const session = crypto.randomUUID();
  globalThis.__launch.user = null;
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await post(route, { session, productId: 'wood' })).status,
      200,
    );
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM product_visits').get().n, 1);
  assert.equal((await route.GET()).status, 403);
  globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
  assert.equal(
    (await post(route, { session: crypto.randomUUID(), productId: 'wood' }))
      .body.recorded,
    false,
  );
  const stats = await (await route.GET()).json();
  assert.equal(stats.visits[0].visits, 1);
  assert.equal(stats.orders.length, 0);
  sql.close();
});

test('applications enforce adult eligibility, private files, human review, and atomic agent activation', async () => {
  const sql = fixture(),
    route = await api('app/api/agent-applications/route.ts'),
    uploads = await api('app/api/application-files/route.ts'),
    download = await api('app/api/application-files/[id]/route.ts');
  const storage = new Map();
  globalThis.__launch.env.PROFILE_PHOTOS = {
    async put(key, bytes, options) {
      storage.set(key, { body: bytes, httpMetadata: options.httpMetadata });
    },
    async get(key) {
      return storage.get(key);
    },
    async delete(key) {
      storage.delete(key);
    },
  };
  const customer = {
    userId: 'customer-a',
    role: 'customer',
    email: 'customer-a@example.com',
    displayName: 'Ana',
  };
  globalThis.__launch.user = customer;
  const data = {
    name: 'Ana Teste',
    birthDate: '2000-02-29',
    phone: '+258840000001',
    whatsapp: '+258840000001',
    city: 'Maputo',
    occupation: 'Comerciante',
    description: 'Trabalho com vendas e atendimento a clientes.',
    consent: true,
  };
  assert.equal(
    (
      await post(route, {
        action: 'save',
        version: 0,
        data: { ...data, birthDate: '2015-01-01' },
      })
    ).status,
    422,
  );
  let result = await post(route, { action: 'save', version: 0, data });
  assert.equal(result.status, 200);
  let app = result.body.application;
  assert.equal(
    (await post(route, { action: 'submit', version: app.version })).status,
    409,
  );
  for (const kind of ['portrait', 'id-front', 'id-back']) {
    const r = await uploads.POST(
      new Request(origin + '/api/application-files?kind=' + kind, {
        method: 'POST',
        headers: { origin },
        body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      }),
    );
    assert.equal(r.status, 200, await r.text());
  }
  app = (await (await route.GET(new Request(origin))).json()).application;
  const fileId = app.files[0].id;
  assert.equal(app.files.length, 3);
  result = await post(route, { action: 'submit', version: app.version });
  assert.equal(result.status, 200);
  app = result.body.application;
  assert.equal(
    (await post(route, { action: 'save', version: app.version, data })).status,
    409,
  );
  globalThis.__launch.user = {
    userId: 'customer-b',
    role: 'customer',
    email: 'customer-b@example.com',
  };
  assert.equal(
    (
      await download.GET(new Request(origin), {
        params: Promise.resolve({ id: fileId }),
      })
    ).status,
    404,
  );
  assert.equal(
    (await route.GET(new Request(origin + '?review=1'))).status,
    403,
  );
  globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
  const image = await download.GET(new Request(origin), {
    params: Promise.resolve({ id: fileId }),
  });
  assert.equal(image.status, 200);
  assert.match(image.headers.get('cache-control'), /no-store/);
  assert.equal(
    (
      await post(route, {
        action: 'review',
        id: app.id,
        version: app.version,
        status: 'APPROVED',
        note: '',
      })
    ).status,
    422,
  );
  sql
    .prepare('INSERT INTO auth_sessions VALUES(?,?,?)')
    .run('test-session', 'customer-a', Date.now() + 60000);
  assert.equal(
    (
      await post(route, {
        action: 'review',
        id: app.id,
        version: app.version,
        status: 'APPROVED',
        identityVerified: true,
        note: '',
      })
    ).status,
    200,
  );
  assert.equal(
    sql.prepare("SELECT role FROM auth_accounts WHERE id='customer-a'").get()
      .role,
    'agent',
  );
  assert.equal(
    sql
      .prepare(
        "SELECT COUNT(*) n FROM auth_sessions WHERE account_id='customer-a'",
      )
      .get().n,
    0,
  );
  assert.equal(
    sql
      .prepare(
        "SELECT COUNT(*) n FROM manager_records WHERE id='customer-a' AND kind='agent'",
      )
      .get().n,
    1,
  );
  assert.equal(
    (
      await post(route, {
        action: 'review',
        id: app.id,
        version: app.version,
        status: 'APPROVED',
        identityVerified: true,
        note: '',
      })
    ).status,
    409,
  );
  sql.close();
});
const profile = {
  name: 'Cliente Teste',
  username: 'cliente_teste',
  title: '',
  email: 'cliente@example.com',
  phone: '',
  website: '',
  showEmail: false,
  showPhone: false,
  links: [],
  bio: '',
  photoUrl: '',
  photoPosition: 35,
};
async function checkoutFixture(workspace) {
  let r = await post(workspace, {
    action: 'save-profile',
    version: 0,
    profile,
  });
  assert.equal(r.status, 200, JSON.stringify(r));
  r = await post(workspace, {
    action: 'activate-sandbox-plan',
    version: 0,
    planId: 'free-30',
    planVersion: 0,
  });
  assert.equal(r.status, 200, JSON.stringify(r));
  return {
    action: 'submit-order',
    checkout: true,
    approveProfile: true,
    id: crypto.randomUUID(),
    productId: 'keychain',
    planId: 'free-30',
    planVersion: 0,
    profileVersion: 1,
    design: { optionId: 'tiktok' },
    deliveryCity: 'Maputo',
    deliveryAddress: 'Bairro Central',
    deliveryContact: '+258840000000',
  };
}

test('customer data and all three keychain purchases work with the complete schema', async () => {
  const workspace = await api('app/api/workspace/route.ts');
  const optionsApi = await api('app/api/product-options/route.ts');
  for (const optionId of ['tiktok', 'instagram', 'pattern']) {
    const sql = fixture();
    const initial = await workspace.GET();
    assert.equal(initial.status, 200);
    assert.equal((await initial.json()).profile, null);
    const optionsResponse = await optionsApi.GET();
    assert.equal(optionsResponse.status, 200);
    const { options } = await optionsResponse.json();
    assert.equal(options.find(o => o.id === optionId).enabled, 1);
    const body = await checkoutFixture(workspace);
    body.design = { optionId };
    const result = await post(workspace, body);
    assert.equal(result.status, 200, JSON.stringify(result));
    const loaded = await workspace.GET();
    assert.equal(loaded.status, 200);
    const data = await loaded.json();
    assert.equal(data.profile.name, profile.name);
    assert.equal(data.orders.length, 1);
    const storedOrder = JSON.parse(sql.prepare('SELECT data_json FROM sandbox_orders WHERE id=?').get(body.id).data_json);
    assert.equal(storedOrder.design.optionId, optionId);
    assert.equal(data.orders[0].amount, 50000);
    assert.equal(sql.prepare('SELECT quantity FROM product_options WHERE id=?').get(optionId).quantity, 499);
    sql.close();
  }
});

test('manager edits store meticais without reconverting saved plan prices', async () => {
  const sql = fixture();
  globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
  const manager = await api('app/api/manager/route.ts');
  const plansApi = await api('lib/server-plans.ts');
  sql.prepare('INSERT INTO manager_records VALUES(?,?,?,?,?)').run(
    'legacy', 'plan', JSON.stringify({ name: 'Legado', dollars: 3, active: true }), 1, new Date().toISOString(),
  );
  assert.equal((await plansApi.getManagedPlans()).find(p => p.id === 'legacy').meticais, 191.73);
  const result = await post(manager, {
    action: 'plan', id: 'legacy', version: 1, name: 'Plano', audience: 'Todos',
    description: 'Plano em meticais', meticais: 200, links: 3, bio: 100, active: true,
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  const stored = JSON.parse(sql.prepare("SELECT data_json FROM manager_records WHERE id='legacy'").get().data_json);
  assert.equal(stored.meticais, 200);
  assert.equal(stored.dollars, undefined);
  assert.equal((await plansApi.getManagedPlans()).find(p => p.id === 'legacy').meticais, 200);
  sql.close();
});
test('launch: publication requires a valid trial, checkout is atomic, retries are safe, costs stay private', async () => {
  const sql = fixture(),
    workspace = await api('app/api/workspace/route.ts');
  assert.equal(
    (await post(workspace, { action: 'publish-profile', version: 0, profile }))
      .status,
    403,
  );
  const body = await checkoutFixture(workspace);
  assert.equal(
    sql
      .prepare(
        "SELECT published_json FROM profiles WHERE owner_id='customer-a'",
      )
      .get().published_json,
    null,
  );
  const result = await post(workspace, body);
  assert.equal(result.status, 200, JSON.stringify(result));
  assert.equal(result.body.order.paid, false);
  assert.equal(result.body.order.status, 'PENDING_PAYMENT');
  assert.equal(
    sql
      .prepare("SELECT version FROM profiles WHERE owner_id='customer-a'")
      .get().version,
    2,
  );
  assert.equal(
    sql.prepare("SELECT quantity FROM product_options WHERE id='tiktok'").get()
      .quantity,
    499,
  );
  assert.equal((await post(workspace, body)).status, 200);
  assert.equal(
    (await post(workspace, { ...body, deliveryContact: '+258841111111' }))
      .status,
    409,
  );
  assert.equal(
    sql.prepare("SELECT quantity FROM product_options WHERE id='tiktok'").get()
      .quantity,
    499,
  );
  const data = await (await workspace.GET()).json();
  for (const key of [
    'cost',
    'journal',
    'ownerId',
    'checkoutFingerprint',
    'approvedProfileSnapshot',
  ])
    assert.equal(key in data.orders[0], false, key);
  globalThis.__launch.user = { userId: 'customer-b', role: 'customer' };
  assert.equal((await (await workspace.GET()).json()).orders.length, 0);
  assert.equal((await post(workspace, body)).status, 409);
  globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
  sql
    .prepare(
      "UPDATE sandbox_memberships SET trial_started_at='2020-01-01T00:00:00.000Z',trial_expires_at='2020-01-31T00:00:00.000Z'",
    )
    .run();
  assert.equal(
    (await post(workspace, { action: 'publish-profile', profile, version: 2 }))
      .status,
    403,
  );
  const { activeProfileSQL } = await api('lib/entitlement.ts'),
    now = new Date().toISOString();
  assert.equal(
    sql
      .prepare('SELECT COUNT(*) n FROM profiles WHERE ' + activeProfileSQL)
      .get(now, now).n,
    0,
  );
  sql.exec('DELETE FROM sandbox_memberships');
  assert.equal(
    sql
      .prepare('SELECT COUNT(*) n FROM profiles WHERE ' + activeProfileSQL)
      .get(now, now).n,
    0,
  );
  sql.close();
});
test('launch: reservations expire once, pending limits are enforced, failed checkout does not publish', async () => {
  const sql = fixture(),
    workspace = await api('app/api/workspace/route.ts'),
    body = await checkoutFixture(workspace);
  sql.prepare("UPDATE product_options SET quantity=0 WHERE id='tiktok'").run();
  assert.equal((await post(workspace, body)).status, 409);
  assert.equal(
    sql
      .prepare(
        "SELECT published_json FROM profiles WHERE owner_id='customer-a'",
      )
      .get().published_json,
    null,
  );
  sql.prepare("UPDATE product_options SET quantity=10 WHERE id='tiktok'").run();
  for (let i = 0; i < 3; i++)
    assert.equal(
      (
        await post(workspace, {
          ...body,
          id: crypto.randomUUID(),
          profileVersion: 1 + i,
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await post(workspace, {
        ...body,
        id: crypto.randomUUID(),
        profileVersion: 4,
      })
    ).status,
    409,
  );
  sql.exec(
    "UPDATE sandbox_orders SET data_json=json_set(data_json,'$.reservationExpiresAt','2020-01-01T00:00:00.000Z')",
  );
  const { expireReservations } = await api('lib/server-reservations.ts');
  await expireReservations();
  await expireReservations();
  assert.equal(
    sql.prepare("SELECT quantity FROM product_options WHERE id='tiktok'").get()
      .quantity,
    10,
  );
  assert.equal(
    sql
      .prepare(
        "SELECT COUNT(*) n FROM sandbox_events WHERE action='reservation-expired'",
      )
      .get().n,
    3,
  );
  sql.close();
});
test('launch: staff invitations create linked accounts, activate once, enforce roles and revoke sessions', async () => {
  const sql = fixture(),
    accounts = await api('app/api/accounts/route.ts'),
    activate = await api('app/api/activate/route.ts');
  assert.equal((await accounts.GET()).status, 403);
  globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
  assert.equal(
    (
      await post(accounts, {
        action: 'create',
        role: 'director',
        name: 'Director',
        email: 'd@example.com',
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await post(accounts, {
        action: 'update',
        id: 'manager-a',
        version: 1,
        active: 0,
        role: 'manager',
      })
    ).status,
    403,
  );
  const created = await post(accounts, {
    action: 'create',
    role: 'agent',
    name: 'Novo Agente',
    email: 'novo@example.com',
  });
  assert.equal(created.status, 200, JSON.stringify(created));
  const account = sql
    .prepare("SELECT * FROM auth_accounts WHERE email='novo@example.com'")
    .get();
  assert.equal(account.active, 0);
  assert.ok(
    sql
      .prepare("SELECT id FROM manager_records WHERE id=? AND kind='agent'")
      .get(account.id),
  );
  const token = new URL(created.body.invitationUrl).hash.slice(1);
  assert.equal(
    (await post(activate, { token, password: 'Uma-palavra-segura-2026' }))
      .status,
    200,
  );
  assert.equal(
    (await post(activate, { token, password: 'Uma-palavra-segura-2026' }))
      .status,
    410,
  );
  sql
    .prepare('INSERT INTO auth_sessions VALUES(?,?,?)')
    .run('test-token', account.id, Date.now() + 999999);
  assert.equal(
    (
      await post(accounts, {
        action: 'update',
        id: account.id,
        version: 2,
        role: 'agent',
        active: 0,
      })
    ).status,
    200,
  );
  assert.equal(
    sql
      .prepare('SELECT COUNT(*) n FROM auth_sessions WHERE account_id=?')
      .get(account.id).n,
    0,
  );
  sql.exec("UPDATE auth_accounts SET active=0 WHERE id='manager-b'");
  globalThis.__launch.user = { userId: 'director-a', role: 'director' };
  assert.equal(
    (
      await post(accounts, {
        action: 'update',
        id: 'manager-a',
        version: 1,
        role: 'manager',
        active: 0,
      })
    ).status,
    409,
  );
  sql.close();
});
test('launch: manual payments require evidence, exact amount and unique provider references', async () => {
  const sql = fixture(),
    workspace = await api('app/api/workspace/route.ts'),
    body = await checkoutFixture(workspace);
  assert.equal((await post(workspace, body)).status, 200);
  const second = { ...body, id: crypto.randomUUID(), profileVersion: 2 };
  assert.equal((await post(workspace, second)).status, 200);
  sql
    .prepare(
      'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at) VALUES(?,?,?,?,?,?)',
    )
    .run(
      'stock',
      'keychain',
      10,
      'Stock real',
      'manager-a',
      new Date().toISOString(),
    );
  globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
  const manager = await api('app/api/manager/route.ts');
  const evidence = {
    action: 'order',
    step: 'pay',
    orderId: body.id,
    version: 1,
    paymentReference: 'OPS-123456',
    verifiedAmount: 50000,
    currency: 'MZN',
    verifiedInProvider: true,
  };
  assert.equal(
    (await post(manager, { ...evidence, verifiedAmount: 1 })).status,
    422,
  );
  const paid = await post(manager, evidence);
  assert.equal(paid.status, 200, JSON.stringify(paid));
  assert.equal(
    (await post(manager, { ...evidence, orderId: second.id })).status,
    422,
  );
  assert.equal(
    JSON.parse(
      sql
        .prepare('SELECT data_json FROM sandbox_orders WHERE id=?')
        .get(second.id).data_json,
    ).paid,
    false,
  );
  assert.equal(
    sql.prepare('SELECT COUNT(*) n FROM payment_records').get().n,
    1,
  );
  const { paymentLink } = await api('lib/payment-policy.ts');
  assert.ok(
    paymentLink({
      productId: 'keychain',
      amount: 50000,
      paid: false,
      status: 'PENDING_PAYMENT',
    }),
  );
  assert.equal(
    paymentLink({
      productId: 'pvc',
      amount: 50000,
      paid: false,
      status: 'PENDING_PAYMENT',
    }),
    null,
  );
  assert.equal(
    paymentLink({
      productId: 'keychain',
      amount: 60000,
      paid: false,
      status: 'PENDING_PAYMENT',
    }),
    null,
  );
  sql.close();
});
test('launch: upload quota is enforced in the database and releasable after a failed upload', async () => {
  const sql = fixture(),
    quota = await api('lib/server-upload-quota.ts');
  assert.equal(
    await quota.reserveUpload(
      'file-a',
      'customer-a',
      'profiles',
      49 * 1024 * 1024,
    ),
    true,
  );
  assert.equal(
    await quota.reserveUpload(
      'file-b',
      'customer-a',
      'profiles',
      2 * 1024 * 1024,
    ),
    false,
  );
  await quota.releaseUpload('file-a', 'customer-a');
  assert.equal(
    await quota.reserveUpload(
      'file-b',
      'customer-a',
      'profiles',
      2 * 1024 * 1024,
    ),
    true,
  );
  sql.close();
});
