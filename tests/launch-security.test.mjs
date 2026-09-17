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
