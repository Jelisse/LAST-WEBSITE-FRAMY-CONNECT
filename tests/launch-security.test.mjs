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
      0, // Physical stock is initialized by the migration before request handling.
      'Test stock',
      'manager-a',
      new Date().toISOString(),
    );
  globalThis.__launch = {
    user: { userId: 'customer-a', role: 'customer', displayName: 'Customer' },
    env: {
      DB: db,
      PRODUCT_CHECKOUT_ENABLED: 'true', // Exercise legacy order invariants explicitly.
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

test('email-first account routing is rate limited and never creates accounts or sessions', async () => {
  const sql = fixture();
  const auth = await api('app/api/auth/route.ts');
  const accountsBefore = sql
    .prepare('SELECT COUNT(*) n FROM auth_accounts')
    .get().n;
  assert.equal(
    (await post(auth, { action: 'resolve-account', email: 'invalid' })).status,
    422,
  );
  let result = await post(auth, {
    action: 'resolve-account',
    email: ' CUSTOMER-A@EXAMPLE.COM ',
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { mode: 'login' });
  result = await post(auth, {
    action: 'resolve-account',
    email: 'new@example.com',
  });
  assert.deepEqual(result.body, { mode: 'register' });
  sql.exec("UPDATE auth_accounts SET active=0 WHERE id='customer-a'");
  result = await post(auth, {
    action: 'resolve-account',
    email: 'customer-a@example.com',
  });
  assert.deepEqual(result.body, { mode: 'login' });
  for (let i = 0; i < 10; i++)
    result = await post(auth, {
      action: 'resolve-account',
      email: 'customer-a@example.com',
    });
  assert.equal(result.status, 429);
  assert.equal(
    sql.prepare('SELECT COUNT(*) n FROM auth_accounts').get().n,
    accountsBefore,
  );
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n, 0);
  const crossOrigin = new Request(origin + '/api/auth', {
    method: 'POST',
    headers: { origin: 'https://other.example' },
    body: JSON.stringify({
      action: 'resolve-account',
      email: 'new@example.com',
    }),
  });
  assert.equal((await auth.POST(crossOrigin)).status, 403);
  sql.close();
});

test('Maputo inventory records 175 Instagram, 175 TikTok and 150 Pattern without duplicating physical stock', () => {
  const sql = fixture();
  const quantities = () =>
    Object.fromEntries(
      sql
        .prepare(
          "SELECT id,quantity FROM product_options WHERE id IN ('instagram','tiktok','pattern')",
        )
        .all()
        .map((r) => [r.id, r.quantity]),
    );
  assert.deepEqual(quantities(), { instagram: 175, pattern: 150, tiktok: 175 });
  assert.equal(
    sql
      .prepare("SELECT enabled FROM product_options WHERE id='blank-keychain'")
      .get().enabled,
    0,
  );
  const migration = readFileSync(
    resolve(root, 'drizzle/0011_maputo_keychain_stock.sql'),
    'utf8',
  );
  const physicalBefore = sql
    .prepare(
      "SELECT SUM(quantity) n FROM stock_movements WHERE product_id='keychain'",
    )
    .get().n;
  // Simulate a reservation present before the physical count is first recorded.
  sql.exec(
    "DELETE FROM manager_audit WHERE id='owner-maputo-keychain-count-20260919'",
  );
  sql
    .prepare(
      'INSERT INTO sandbox_orders(id,owner_id,data_json,version,created_at) VALUES(?,?,?,?,?)',
    )
    .run(
      'existing-reservation',
      'customer-a',
      JSON.stringify({
        productId: 'keychain',
        design: { optionId: 'instagram' },
        status: 'PENDING_PAYMENT',
      }),
      1,
      new Date().toISOString(),
    );
  sql.exec(migration);
  assert.equal(quantities().instagram, 174);
  // Later sales and explicit manager deactivation must survive a retry/redeploy.
  sql.exec(
    "UPDATE product_options SET quantity=149,enabled=0 WHERE id='pattern'",
  );
  sql.exec(migration);
  assert.equal(quantities().pattern, 149);
  assert.equal(
    sql.prepare("SELECT enabled FROM product_options WHERE id='pattern'").get()
      .enabled,
    0,
  );
  assert.equal(
    sql
      .prepare(
        "SELECT SUM(quantity) n FROM stock_movements WHERE product_id='keychain'",
      )
      .get().n,
    physicalBefore,
  );
  assert.equal(
    sql
      .prepare(
        "SELECT COUNT(*) n FROM manager_audit WHERE id='owner-maputo-keychain-count-20260919'",
      )
      .get().n,
    1,
  );
  sql.close();
});

test('catalogue: concurrent reads never write inventory', async () => {
  const sql = fixture();
  const catalog = await api('lib/server-catalog.ts');
  const before = sql.prepare('SELECT * FROM stock_movements ORDER BY id').all();
  const prepare = globalThis.__launch.env.DB.prepare;
  let reads = 0;
  globalThis.__launch.env.DB.prepare = (query) => {
    assert.match(query, /^SELECT /);
    reads++;
    return prepare(query);
  };
  const results = await Promise.all(
    Array.from({ length: 50 }, () => catalog.getProducts()),
  );
  assert.equal(reads, 50);
  assert.ok(
    results.every((products) =>
      products.some((p) => p.id === 'keychain' && p.available),
    ),
  );
  assert.deepEqual(
    sql.prepare('SELECT * FROM stock_movements ORDER BY id').all(),
    before,
  );
  sql.close();
});

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
    assert.equal(options.find((o) => o.id === optionId).enabled, 1);
    const body = await checkoutFixture(workspace);
    body.design = { optionId };
    const result = await post(workspace, body);
    assert.equal(result.status, 200, JSON.stringify(result));
    const loaded = await workspace.GET();
    assert.equal(loaded.status, 200);
    const data = await loaded.json();
    assert.equal(data.profile.name, profile.name);
    assert.equal(data.orders.length, 1);
    const storedOrder = JSON.parse(
      sql
        .prepare('SELECT data_json FROM sandbox_orders WHERE id=?')
        .get(body.id).data_json,
    );
    assert.equal(storedOrder.design.optionId, optionId);
    assert.equal(data.orders[0].amount, 50000);
    assert.equal(
      sql
        .prepare('SELECT quantity FROM product_options WHERE id=?')
        .get(optionId).quantity,
      optionId === 'pattern' ? 149 : 174,
    );
    sql.close();
  }
});

test('manager edits store meticais without reconverting saved plan prices', async () => {
  const sql = fixture();
  globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
  const manager = await api('app/api/manager/route.ts');
  const plansApi = await api('lib/server-plans.ts');
  sql
    .prepare('INSERT INTO manager_records VALUES(?,?,?,?,?)')
    .run(
      'personal',
      'plan',
      JSON.stringify({ name: 'Legado', dollars: 3, active: true }),
      1,
      new Date().toISOString(),
    );
  assert.equal(
    (await plansApi.getManagedPlans()).find((p) => p.id === 'personal')
      .meticais,
    191.73,
  );
  const result = await post(manager, {
    action: 'plan',
    id: 'personal',
    version: 1,
    name: 'Plano',
    audience: 'Todos',
    description: 'Plano em meticais',
    meticais: 200,
    links: 3,
    bio: 100,
    active: true,
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  const stored = JSON.parse(
    sql
      .prepare("SELECT data_json FROM manager_records WHERE id='personal'")
      .get().data_json,
  );
  assert.equal(stored.meticais, 200);
  assert.equal(stored.dollars, undefined);
  assert.equal(
    (await plansApi.getManagedPlans()).find((p) => p.id === 'personal')
      .meticais,
    200,
  );
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
    174,
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
    174,
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
    200,
  );
  const { activeProfileSQL } = await api('lib/entitlement.ts'),
    now = new Date().toISOString();
  assert.equal(
    sql
      .prepare('SELECT COUNT(*) n FROM profiles WHERE ' + activeProfileSQL)
      .get(now, now).n,
    1,
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
  assert.equal(
    paymentLink({
      productId: 'keychain',
      amount: 50000,
      paid: false,
      status: 'PENDING_PAYMENT',
    }),
    null,
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

test('simplified catalogue preserves historical terms and upgrades trial allowances', async () => {
  const sql = fixture();
  const apiPlans = await api('lib/server-plans.ts');
  const old = {
    id: 'professional',
    name: 'Profissional',
    links: 15,
    bio: 400,
    meticais: 319.55,
    active: true,
    version: 2,
  };
  sql
    .prepare('INSERT INTO manager_records VALUES(?,?,?,?,?)')
    .run(
      'professional',
      'plan',
      JSON.stringify(old),
      2,
      new Date().toISOString(),
    );
  const current = await apiPlans.getManagedPlans();
  assert.deepEqual(
    current.map((p) => [p.id, p.meticais, p.links, p.bio]),
    [
      ['free-30', 0, 20, 600],
      ['personal', 65, 8, 200],
      ['professional-v2', 150, 20, 600],
    ],
  );
  assert.deepEqual(
    apiPlans.membershipTerms({
      plan_id: 'professional',
      terms_json: JSON.stringify(old),
    }),
    old,
  );
  assert.equal(apiPlans.membershipTerms({ plan_id: 'organisation' }).links, 50);
  const trial = apiPlans.membershipTerms({
    plan_id: 'free-30',
    terms_json: JSON.stringify({ ...old, id: 'free-30', meticais: 0 }),
  });
  assert.equal(trial.links, 20);
  assert.equal(trial.bio, 600);
  assert.equal(
    current.some((p) => p.id === 'corporate'),
    false,
  );
  sql.close();
});

test('profile engagement requires consent, published access and valid actions; reports are owner-scoped', async () => {
  const sql = fixture();
  try {
    const workspace = await api('app/api/workspace/route.ts');
    const engagement = await api('app/api/profile-engagement/route.ts');
    await checkoutFixture(workspace);
    assert.equal(
      (
        await post(workspace, {
          action: 'publish-profile',
          profile: {
            ...profile,
            business: {
              whatsapp: '+258840000000',
              message: 'Hello',
              address: 'Maputo',
              hours: '08-17',
              accent: 'green',
              layout: 'compact',
            },
          },
          version: 1,
        })
      ).status,
      200,
    );
    const payload = {
      id: crypto.randomUUID(),
      session: crypto.randomUUID(),
      username: profile.username,
      consent: true,
      kind: 'view',
    };
    assert.equal(
      (await (await engagement.POST(request(payload))).json()).recorded,
      false,
      'owner excluded',
    );
    globalThis.__launch.user = null;
    assert.equal(
      (await engagement.POST(request({ ...payload, consent: false }))).status,
      422,
    );
    assert.equal(
      (
        await engagement.POST(
          new Request(origin + '/api/profile-engagement', {
            method: 'POST',
            body: JSON.stringify(payload),
          }),
        )
      ).status,
      403,
    );
    assert.equal((await engagement.POST(request(payload))).status, 200);
    assert.equal((await engagement.POST(request(payload))).status, 200);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_engagement').get().n,
      1,
      'retry deduplicated',
    );
    assert.equal(
      (
        await engagement.POST(
          request({
            ...payload,
            id: crypto.randomUUID(),
            kind: 'action',
            target: 'whatsapp',
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await engagement.POST(
          request({
            ...payload,
            id: crypto.randomUUID(),
            kind: 'action',
            target: 'link:49',
          }),
        )
      ).status,
      422,
    );
    assert.equal(
      (
        await engagement.POST(
          new Request(origin + '/api/profile-engagement', {
            method: 'POST',
            headers: { origin },
            body: 'x'.repeat(1025),
          }),
        )
      ).status,
      413,
    );
    assert.equal(
      (
        await engagement.POST(
          new Request(origin + '/api/profile-engagement', {
            method: 'POST',
            headers: { origin },
            body: '{bad',
          }),
        )
      ).status,
      422,
    );
    assert.equal(
      (await engagement.GET(new Request(origin + '/api/profile-engagement')))
        .status,
      401,
    );
    globalThis.__launch.user = { userId: 'customer-b', role: 'customer' };
    assert.equal(
      (
        await engagement.GET(
          new Request(origin + '/api/profile-engagement?owner=customer-a'),
        )
      ).status,
      403,
    );
    globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
    const report = await (
      await engagement.GET(new Request(origin + '/api/profile-engagement'))
    ).json();
    assert.equal(report.summary.views, 1);
    assert.equal(report.summary.actions, 1);
    assert.equal(report.actions[0].label, 'WhatsApp');
    assert.equal(JSON.stringify(report).includes(payload.session), false);
    assert.equal(
      (
        await engagement.GET(
          new Request(origin + '/api/profile-engagement?days=999'),
        )
      ).status,
      422,
    );
    await post(workspace, { action: 'unpublish-profile', profile, version: 2 });
    globalThis.__launch.user = null;
    assert.equal(
      (
        await (
          await engagement.POST(
            request({ ...payload, id: crypto.randomUUID() }),
          )
        ).json()
      ).recorded,
      false,
    );
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_engagement').get().n,
      2,
    );
  } finally {
    sql.close();
  }
});

test('subscription payments require manager verification, deduplicate receipts and preserve scheduled downgrades', async () => {
  const sql = fixture();
  try {
    const workspace = await api('app/api/workspace/route.ts'),
      billing = await api('app/api/profile-subscriptions/route.ts');
    await checkoutFixture(workspace);
    assert.equal(
      (
        await post(billing, {
          action: 'request',
          planId: 'professional-v2',
          planVersion: 0,
          accepted: true,
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await post(billing, {
          action: 'settings',
          enabled: true,
          instructions: 'Bank account approved by the business',
          version: 0,
        })
      ).status,
      403,
    );
    globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
    assert.equal(
      (
        await post(billing, {
          action: 'settings',
          enabled: true,
          instructions: 'Bank account approved by the business',
          version: 0,
        })
      ).status,
      200,
    );
    globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
    const first = await post(billing, {
      action: 'request',
      planId: 'professional-v2',
      planVersion: 0,
      accepted: true,
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.invoice.amount, 15000);
    const id = first.body.invoice.id;
    assert.equal(
      (
        await post(billing, {
          action: 'request',
          planId: 'personal',
          planVersion: 0,
          accepted: true,
        })
      ).body.invoice.id,
      id,
      'one pending payment',
    );
    const confirmation = {
      action: 'confirm',
      id,
      paymentReference: 'SUBSCRIPTION-001',
      verifiedInProvider: true,
      verifiedAmount: 15000,
      currency: 'MZN',
    };
    assert.equal((await post(billing, confirmation)).status, 403);
    globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
    assert.equal(
      (await post(billing, { ...confirmation, verifiedAmount: 50000 })).status,
      422,
    );
    assert.equal((await post(billing, confirmation)).status, 200);
    const before = sql
      .prepare("SELECT * FROM sandbox_memberships WHERE owner_id='customer-a'")
      .get();
    assert.equal(before.plan_id, 'professional-v2');
    assert.ok(before.paid_expires_at > new Date().toISOString());
    assert.equal((await post(billing, confirmation)).status, 200);
    assert.equal(
      sql
        .prepare(
          "SELECT version FROM sandbox_memberships WHERE owner_id='customer-a'",
        )
        .get().version,
      before.version,
      'retry does not extend period',
    );
    globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
    const second = (
      await post(billing, {
        action: 'request',
        planId: 'personal',
        planVersion: 0,
        accepted: true,
      })
    ).body.invoice;
    globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
    assert.equal(
      (
        await post(billing, {
          ...confirmation,
          id: second.id,
          verifiedAmount: 6500,
        })
      ).status,
      409,
      'same provider reference cannot fund another month',
    );
    assert.equal(
      (
        await post(billing, {
          ...confirmation,
          id: second.id,
          verifiedAmount: 6500,
          paymentReference: 'SUBSCRIPTION-002',
        })
      ).status,
      200,
    );
    const scheduled = sql
      .prepare("SELECT * FROM sandbox_memberships WHERE owner_id='customer-a'")
      .get();
    assert.equal(scheduled.plan_id, 'professional-v2');
    assert.equal(scheduled.next_plan_id, 'personal');
    assert.equal(scheduled.next_starts_at, before.paid_expires_at);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_receipts').get().n,
      2,
    );
    globalThis.__launch.user = { userId: 'customer-b', role: 'customer' };
    assert.equal((await (await billing.GET()).json()).invoices.length, 0);
  } finally {
    sql.close();
  }
});

test('enquiry forms enforce published consent, owner isolation and deduplicate visitor retries', async () => {
  const sql = fixture();
  try {
    const workspace = await api('app/api/workspace/route.ts'),
      inbox = await api('app/api/profile-enquiries/route.ts');
    await checkoutFixture(workspace);
    const p = {
      ...profile,
      extras: {
        enquiries: true,
        services: [
          {
            title: 'Design',
            description: 'Brand design',
            price: 'Sob consulta',
            url: 'https://example.com/design',
          },
        ],
        english: { title: 'Designer', bio: 'Hello', hours: '' },
        visibleLinks: null,
        primaryContact: '',
      },
    };
    assert.equal(
      (
        await post(workspace, {
          action: 'publish-profile',
          profile: p,
          version: 1,
        })
      ).status,
      200,
    );
    globalThis.__launch.user = null;
    const data = {
      id: crypto.randomUUID(),
      username: profile.username,
      name: 'Visitor',
      email: 'visitor@example.com',
      message: 'Please tell me about your services.',
      consent: true,
    };
    assert.equal((await post(inbox, { ...data, consent: false })).status, 422);
    assert.equal((await post(inbox, data)).status, 200);
    assert.equal((await post(inbox, data)).status, 200);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_enquiries').get().n,
      1,
    );
    assert.equal((await inbox.GET()).status, 401);
    globalThis.__launch.user = { userId: 'customer-b', role: 'customer' };
    assert.equal((await (await inbox.GET()).json()).enquiries.length, 0);
    await post(inbox, { action: 'delete', id: data.id });
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_enquiries').get().n,
      1,
    );
    globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
    assert.equal((await (await inbox.GET()).json()).enquiries.length, 1);
    await post(inbox, { action: 'status', id: data.id, status: 'closed' });
    assert.equal(
      sql.prepare('SELECT status FROM profile_enquiries').get().status,
      'closed',
    );
    await post(inbox, { action: 'delete', id: data.id });
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_enquiries').get().n,
      0,
    );
  } finally {
    sql.close();
  }
});

test('teams require matching-email acceptance and lose edit permission immediately on departure', async () => {
  const sql = fixture();
  try {
    const workspace = await api('app/api/workspace/route.ts'),
      teams = await api('app/api/profile-teams/route.ts');
    await checkoutFixture(workspace);
    assert.equal(
      (await post(teams, { action: 'create', name: 'Maputo Studio' })).status,
      200,
    );
    assert.equal(
      (await post(teams, { action: 'invite', email: 'customer-b@example.com' }))
        .status,
      200,
    );
    const invitation = sql.prepare('SELECT * FROM profile_team_invites').get();
    assert.equal(
      (
        await post(teams, {
          action: 'accept',
          id: invitation.id,
          consent: true,
        })
      ).status,
      422,
      'another account cannot accept',
    );
    globalThis.__launch.user = { userId: 'customer-b', role: 'customer' };
    assert.equal(
      (
        await post(teams, {
          action: 'accept',
          id: invitation.id,
          consent: false,
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await post(teams, {
          action: 'accept',
          id: invitation.id,
          consent: true,
        })
      ).status,
      200,
    );
    await post(workspace, {
      action: 'save-profile',
      profile: { ...profile, username: 'customer_b' },
      version: 0,
    });
    globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
    assert.equal(
      (
        await post(teams, {
          action: 'brand',
          id: 'customer-b',
          version: 1,
          accent: 'blue',
        })
      ).status,
      200,
    );
    assert.equal(
      JSON.parse(
        sql
          .prepare(
            "SELECT draft_json FROM profiles WHERE owner_id='customer-b'",
          )
          .get().draft_json,
      ).business.accent,
      'blue',
    );
    globalThis.__launch.user = { userId: 'customer-b', role: 'customer' };
    await post(teams, { action: 'leave', id: invitation.team_id });
    globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
    assert.equal(
      (
        await post(teams, {
          action: 'brand',
          id: 'customer-b',
          version: 2,
          accent: 'green',
        })
      ).status,
      409,
    );
  } finally {
    sql.close();
  }
});

test('expiry reminders are durable and idempotent without an email provider; launch trials are not nagged', async () => {
  const sql = fixture();
  try {
    const workspace = await api('app/api/workspace/route.ts');
    await checkoutFixture(workspace);
    const { profileReminders } = await api('lib/profile-reminders.ts');
    const now = Date.now();
    const end = new Date(now + 86400000 / 2).toISOString(),
      start = new Date(now - 29 * 86400000).toISOString();
    sql
      .prepare(
        "UPDATE sandbox_memberships SET trial_started_at=?,trial_expires_at=? WHERE owner_id='customer-a'",
      )
      .run(start, end);
    await profileReminders(globalThis.__launch.env, now);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_notices').get().n,
      0,
    );
    sql.exec('UPDATE profile_billing_settings SET enabled=1');
    await profileReminders(globalThis.__launch.env, now);
    await profileReminders(globalThis.__launch.env, now);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_notices').get().n,
      1,
    );
    assert.equal(
      sql.prepare('SELECT sent_at FROM profile_notices').get().sent_at,
      null,
    );
    await profileReminders(globalThis.__launch.env, now + 2 * 86400000);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_notices').get().n,
      2,
    );
    await profileReminders(globalThis.__launch.env, now + 9 * 86400000);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_notices').get().n,
      3,
    );
  } finally {
    sql.close();
  }
});

test('custom domains require DNS ownership, correct CNAME and active TLS; owner-only removal', async () => {
  const sql = fixture(),
    original = globalThis.fetch;
  try {
    const workspace = await api('app/api/workspace/route.ts'),
      domains = await api('app/api/profile-domains/route.ts');
    await checkoutFixture(workspace);
    assert.equal(
      (await post(domains, { action: 'add', hostname: '127.0.0.1' })).status,
      422,
    );
    assert.equal(
      (
        await post(domains, {
          action: 'add',
          hostname: 'profile.customer.test',
        })
      ).status,
      200,
    );
    const row = sql.prepare('SELECT * FROM profile_domains').get();
    let prove = false,
      tls = false;
    globalThis.fetch = async (url, options) =>
      String(url).startsWith('https://cloudflare-dns.com')
        ? Response.json({
            Answer: String(url).includes('type=TXT')
              ? [{ type: 16, data: prove ? '"' + row.token + '"' : '"wrong"' }]
              : [{ type: 5, data: 'profiles.framy.example.' }],
          })
        : Response.json({
            success: true,
            result: {
              id: 'cf-123',
              status: 'active',
              ssl: { status: tls ? 'active' : 'pending_validation' },
            },
          });
    Object.assign(globalThis.__launch.env, {
      CF_SAAS_TOKEN: 'test-only',
      CF_SAAS_ZONE_ID: 'a'.repeat(32),
      CF_SAAS_CNAME_TARGET: 'profiles.framy.example',
    });
    assert.equal((await post(domains, { action: 'verify' })).status, 200);
    assert.equal(
      sql.prepare('SELECT status FROM profile_domains').get().status,
      'pending',
    );
    prove = true;
    assert.equal((await post(domains, { action: 'verify' })).status, 200);
    assert.equal(
      sql.prepare('SELECT status FROM profile_domains').get().status,
      'validating',
    );
    tls = true;
    assert.equal((await post(domains, { action: 'verify' })).status, 200);
    assert.equal(
      sql.prepare('SELECT status FROM profile_domains').get().status,
      'active',
    );
    globalThis.__launch.user = { userId: 'customer-b', role: 'customer' };
    await post(domains, { action: 'remove' });
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_domains').get().n,
      1,
    );
    globalThis.__launch.user = { userId: 'customer-a', role: 'customer' };
    assert.equal((await post(domains, { action: 'remove' })).status, 200);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM profile_domains').get().n,
      0,
    );
  } finally {
    globalThis.fetch = original;
    sql.close();
  }
});

test('custom hostname routing exposes only the assigned public profile and removes account credentials', async () => {
  const sql = fixture();
  try {
    const workspace = await api('app/api/workspace/route.ts');
    await checkoutFixture(workspace);
    await post(workspace, { action: 'publish-profile', profile, version: 1 });
    const { customDomainRequest } = await api('lib/custom-domain-request.ts');
    const env = { ...globalThis.__launch.env, PUBLIC_SITE_URL: origin };
    sql
      .prepare(
        "INSERT INTO profile_domains(hostname,owner_id,token,status,checked_at,created_at) VALUES('profile.customer.test','customer-a','token','active',?,?)",
      )
      .run(Date.now(), Date.now());
    const routed = await customDomainRequest(
      new Request('https://profile.customer.test/', {
        headers: { cookie: 'framy_session=private', authorization: 'private' },
      }),
      env,
    );
    assert.ok(routed instanceof Request);
    assert.equal(new URL(routed.url).pathname, '/' + profile.username);
    assert.equal(routed.headers.get('cookie'), null);
    assert.equal(routed.headers.get('authorization'), null);
    for (const path of [
      '/api/workspace',
      '/manager',
      '/entrar',
      '/other_profile',
    ])
      assert.equal(
        (
          await customDomainRequest(
            new Request('https://profile.customer.test' + path),
            env,
          )
        ).status,
        404,
      );
    const forwarded = await customDomainRequest(
      new Request('https://profile.customer.test/api/profile-enquiries', {
        method: 'POST',
        headers: {
          origin: 'https://profile.customer.test',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }),
      env,
    );
    assert.ok(forwarded instanceof Request);
    assert.equal(forwarded.headers.get('origin'), origin);
    assert.equal(await forwarded.text(), '{}');
    assert.equal(
      (
        await customDomainRequest(
          new Request('https://profile.customer.test/api/profile-enquiries', {
            method: 'POST',
            headers: { origin: 'https://evil.test' },
            body: '{}',
          }),
          env,
        )
      ).status,
      403,
    );
    sql.exec("UPDATE auth_accounts SET active=0 WHERE id='customer-a'");
    assert.equal(
      (
        await customDomainRequest(
          new Request('https://profile.customer.test/'),
          env,
        )
      ).status,
      404,
    );
  } finally {
    sql.close();
  }
});

test('paid profiles can buy physical products without restarting a trial or deleting excess draft content', async () => {
  const sql = fixture();
  try {
    const workspace = await api('app/api/workspace/route.ts');
    const checkout = await checkoutFixture(workspace);
    const terms = {
      id: 'personal',
      name: 'Pessoal',
      meticais: 65,
      links: 8,
      bio: 200,
      version: 0,
      active: true,
      audience: 'Todos',
      description: 'Plan',
    };
    sql
      .prepare(
        "UPDATE sandbox_memberships SET plan_id='personal',terms_json=?,paid_started_at=?,paid_expires_at=? WHERE owner_id='customer-a'",
      )
      .run(
        JSON.stringify(terms),
        new Date(Date.now() - 86400000).toISOString(),
        new Date(Date.now() + 20 * 86400000).toISOString(),
      );
    const expanded = {
      ...profile,
      links: Array.from({ length: 12 }, (_, i) => ({
        label: 'Link ' + i,
        url: 'https://example.com/' + i,
      })),
      bio: 'x'.repeat(400),
    };
    assert.equal(
      (
        await post(workspace, {
          action: 'save-profile',
          version: 1,
          profile: expanded,
        })
      ).status,
      200,
    );
    assert.equal(
      JSON.parse(
        sql
          .prepare(
            "SELECT draft_json FROM profiles WHERE owner_id='customer-a'",
          )
          .get().draft_json,
      ).links.length,
      12,
    );
    assert.equal(
      (
        await post(workspace, {
          action: 'activate-sandbox-plan',
          planId: 'free-30',
          planVersion: 0,
          version: 1,
        })
      ).status,
      422,
    );
    const order = await post(workspace, {
      ...checkout,
      planId: 'personal',
      profileVersion: 2,
    });
    assert.equal(order.status, 200, JSON.stringify(order));
    assert.equal(
      sql
        .prepare(
          "SELECT plan_id FROM sandbox_memberships WHERE owner_id='customer-a'",
        )
        .get().plan_id,
      'personal',
    );
  } finally {
    sql.close();
  }
});

test('email reminders send only the current phase and do not resend confirmed deliveries', async () => {
  const sql = fixture(),
    original = globalThis.fetch;
  try {
    const workspace = await api('app/api/workspace/route.ts');
    await checkoutFixture(workspace);
    const { profileReminders } = await api('lib/profile-reminders.ts');
    const now = Date.now(),
      expiry = new Date(now - 60000).toISOString();
    sql
      .prepare(
        "UPDATE sandbox_memberships SET trial_started_at=?,trial_expires_at=? WHERE owner_id='customer-a'",
      )
      .run(new Date(now - 29 * 86400000).toISOString(), expiry);
    sql.exec('UPDATE profile_billing_settings SET enabled=1');
    sql
      .prepare(
        "INSERT INTO profile_notices(id,owner_id,subject,message,created_at) VALUES(?,'customer-a','Old phase','Old warning',?)",
      )
      .run('customer-a:' + expiry + ':1', now - 3600000);
    const sent = [];
    globalThis.fetch = async (url, options) => {
      sent.push({ url, options });
      return Response.json({ id: 'local-email-test' });
    };
    const env = {
      ...globalThis.__launch.env,
      RESEND_API_KEY: 'mock-only',
      PROFILE_EMAIL_FROM: 'Framy <test@example.com>',
    };
    await profileReminders(env, now);
    await profileReminders(env, now + 1000);
    assert.equal(sent.length, 1);
    assert.ok(sent[0].options.headers['Idempotency-Key'].endsWith(':grace'));
    assert.equal(
      sql
        .prepare(
          'SELECT COUNT(*) n FROM profile_notices WHERE sent_at IS NOT NULL',
        )
        .get().n,
      1,
    );
  } finally {
    globalThis.fetch = original;
    sql.close();
  }
});

test('public www alias redirects without querying customer-domain tables', async () => {
  const { customDomainRequest } = await api('lib/custom-domain-request.ts');
  const env = {
    PUBLIC_SITE_URL: 'https://framyconnect.co.mz',
    DB: {
      prepare() {
        throw new Error('Public aliases must not query D1');
      },
    },
  };
  for (const path of [
    '/',
    '/encomendar/keychain',
    '/entrar?return_to=%2Fencomendar%2Fkeychain&mode=register',
  ]) {
    const response = await customDomainRequest(
      new Request('https://www.framyconnect.co.mz' + path),
      env,
    );
    assert.equal(response.status, 308);
    assert.equal(
      response.headers.get('location'),
      'https://framyconnect.co.mz' + path,
    );
  }
  const canonical = new Request('https://framyconnect.co.mz/');
  assert.equal(await customDomainRequest(canonical, env), canonical);
  const unrelated = new Request('https://www.attacker.test/');
  await assert.rejects(
    customDomainRequest(unrelated, env),
    /must not query D1/,
  );
});

test('customer recovery sends only to registered email, keeps access until redemption and revokes all old sessions', async () => {
  const sql = fixture(),
    original = globalThis.fetch;
  const recovery = await api('app/api/account-recovery/route.ts');
  const version = sql
    .prepare("SELECT version FROM auth_accounts WHERE id='customer-a'")
    .get().version;
  const send = { action: 'send', id: 'customer-a', version, confirmed: true };
  const messages = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    messages.push(JSON.parse(init.body));
    return Response.json({ id: 'email-test' });
  };
  try {
    assert.equal((await post(recovery, send)).status, 403);
    globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
    assert.equal((await post(recovery, send)).status, 503);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM auth_recovery').get().n,
      0,
    );
    Object.assign(globalThis.__launch.env, {
      RESEND_API_KEY: 'test-only',
      PROFILE_EMAIL_FROM: 'Framy <support@example.com>',
      PUBLIC_SITE_URL: origin,
    });
    assert.equal(
      (await post(recovery, { ...send, email: 'attacker@example.com' })).status,
      422,
    );
    assert.equal(
      (await post(recovery, { ...send, confirmed: false })).status,
      422,
    );
    assert.equal(
      (await post(recovery, { ...send, id: 'manager-b' })).status,
      404,
    );
    sql
      .prepare(
        'INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)',
      )
      .run('old-session', 'customer-a', Date.now() + 900000);
    const sent = await post(recovery, send);
    assert.equal(sent.status, 200);
    assert.equal(sent.body.invitationUrl, undefined);
    assert.equal(sent.body.token, undefined);
    assert.deepEqual(messages[0].to, ['customer-a@example.com']);
    assert.match(messages[0].text, /email de acesso: customer-a@example.com/);
    const token = messages[0].text.match(/recuperar#([a-f0-9]{64})/)[1];
    assert.notEqual(
      sql.prepare('SELECT token_hash FROM auth_recovery').get().token_hash,
      token,
    );
    assert.equal(
      sql
        .prepare("SELECT active FROM auth_accounts WHERE id='customer-a'")
        .get().active,
      1,
    );
    assert.equal(
      sql
        .prepare(
          "SELECT password_hash FROM auth_accounts WHERE id='customer-a'",
        )
        .get().password_hash,
      '!test',
    );
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,
      1,
    );
    globalThis.__launch.user = null;
    const attempts = await Promise.all([
      post(recovery, {
        action: 'reset',
        token,
        password: 'New-long-password-2026',
      }),
      post(recovery, {
        action: 'reset',
        token,
        password: 'Another-long-password-2026',
      }),
    ]);
    assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 410]);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,
      0,
    );
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM auth_recovery').get().n,
      0,
    );
    assert.match(
      sql
        .prepare(
          "SELECT password_hash FROM auth_accounts WHERE id='customer-a'",
        )
        .get().password_hash,
      /^\$2[ab]\$12\$/,
    );
    assert.equal(
      (
        await post(recovery, {
          action: 'reset',
          token,
          password: 'New-long-password-2026',
        })
      ).status,
      410,
    );
    assert.equal(
      sql
        .prepare(
          "SELECT COUNT(*) n FROM manager_audit WHERE action='Cliente concluiu recuperação; sessões terminadas'",
        )
        .get().n,
      1,
    );
  } finally {
    globalThis.fetch = original;
    sql.close();
  }
});

test('customer recovery rejects expiry, account changes and inactive issuer, and never enables suspended accounts', async () => {
  const original = globalThis.fetch;
  for (const mutation of [
    'UPDATE auth_recovery SET expires_at=0',
    "UPDATE auth_accounts SET active=0 WHERE id='customer-a'",
    "UPDATE auth_accounts SET email='changed@example.com' WHERE id='customer-a'",
    "UPDATE auth_accounts SET version=version+1 WHERE id='customer-a'",
    "UPDATE auth_accounts SET active=0 WHERE id='manager-a'",
    "UPDATE auth_accounts SET role='agent' WHERE id='customer-a'",
  ]) {
    const sql = fixture();
    let token;
    try {
      const recovery = await api('app/api/account-recovery/route.ts');
      globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
      Object.assign(globalThis.__launch.env, {
        RESEND_API_KEY: 'test-only',
        PROFILE_EMAIL_FROM: 'support@example.com',
        PUBLIC_SITE_URL: origin,
      });
      globalThis.fetch = async (_url, init) => {
        token = JSON.parse(init.body).text.match(/recuperar#([a-f0-9]{64})/)[1];
        return Response.json({ id: 'test-email' });
      };
      const version = sql
        .prepare("SELECT version FROM auth_accounts WHERE id='customer-a'")
        .get().version;
      assert.equal(
        (
          await post(recovery, {
            action: 'send',
            id: 'customer-a',
            version,
            confirmed: true,
          })
        ).status,
        200,
      );
      sql.exec(mutation);
      assert.equal(
        (
          await post(recovery, {
            action: 'reset',
            token,
            password: 'New-long-password-2026',
          })
        ).status,
        410,
        mutation,
      );
      assert.equal(
        sql
          .prepare(
            "SELECT password_hash FROM auth_accounts WHERE id='customer-a'",
          )
          .get().password_hash,
        '!test',
      );
    } finally {
      sql.close();
    }
  }
  globalThis.fetch = original;
});

test('failed recovery delivery leaves credentials intact; send limits and origin checks apply', async () => {
  const sql = fixture(),
    original = globalThis.fetch;
  try {
    const recovery = await api('app/api/account-recovery/route.ts');
    globalThis.__launch.user = { userId: 'manager-a', role: 'manager' };
    Object.assign(globalThis.__launch.env, {
      RESEND_API_KEY: 'test-only',
      PROFILE_EMAIL_FROM: 'support@example.com',
      PUBLIC_SITE_URL: origin,
    });
    const version = sql
      .prepare("SELECT version FROM auth_accounts WHERE id='customer-a'")
      .get().version;
    const send = { action: 'send', id: 'customer-a', version, confirmed: true };
    globalThis.fetch = async () =>
      Response.json({ error: 'provider-failure' }, { status: 500 });
    for (let i = 0; i < 3; i++)
      assert.equal((await post(recovery, send)).status, 502);
    assert.equal((await post(recovery, send)).status, 429);
    assert.equal(
      sql.prepare('SELECT COUNT(*) n FROM auth_recovery').get().n,
      0,
    );
    assert.equal(
      sql
        .prepare("SELECT active FROM auth_accounts WHERE id='customer-a'")
        .get().active,
      1,
    );
    assert.equal(
      (
        await recovery.POST(
          new Request(origin + '/api/account-recovery', {
            method: 'POST',
            headers: { origin: 'https://evil.example' },
            body: JSON.stringify(send),
          }),
        )
      ).status,
      403,
    );
    const accounts = await api('app/api/accounts/route.ts');
    assert.equal(
      (await post(accounts, { action: 'invite', id: 'customer-a', version }))
        .status,
      422,
    );
    const response = await accounts.GET(
      new Request(origin + '/api/accounts?q=customer-b'),
    );
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(
      result.accounts.map((a) => a.id),
      ['customer-b'],
    );
  } finally {
    globalThis.fetch = original;
    sql.close();
  }
});


test('maintenance rejects new orders without writing stock or orders and leaves tracking readable', async () => {
  const sql = fixture();
  delete globalThis.__launch.env.PRODUCT_CHECKOUT_ENABLED;
  const workspace = await api('app/api/workspace/route.ts');
  for (const action of ['submit-order', 'create-order']) {
    const response = await post(workspace, { action, id: crypto.randomUUID(), productId: 'keychain' });
    assert.equal(response.status, 503);
  }
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM sandbox_orders').get().n, 0);
  assert.equal((await workspace.GET()).status, 200);
  sql.close();
});
