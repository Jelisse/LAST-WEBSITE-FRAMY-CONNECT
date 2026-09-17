import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';
import {
  agentTransition,
  agentOrderView,
  availableAgentActions,
} from '../lib/agent-workflow.ts';
const origin = 'https://framy.example';
const base = () => ({
  id: 'order-a',
  productId: 'pvc',
  productName: 'PVC',
  amount: 95000,
  cost: 10000,
  paid: true,
  refunded: false,
  status: 'QUEUED',
  agent: 'Agent A',
  agentId: 'agent-a',
  qc: false,
  proof: '',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  journal: [],
  profileUsername: 'customer',
  design: {
    optionId: 'blank-card',
    profileUrl: origin + '/customer',
    holderName: 'Customer',
  },
});
const quality = { nfc: true, customer: true, print: true, condition: true };

test('agent workflow enforces paid assignment, exact URL and every fulfilment checkpoint', () => {
  let order = base();
  assert.throws(() => agentTransition(order, 'agent-b', 'start', {}, origin));
  assert.throws(() =>
    agentTransition({ ...order, paid: false }, 'agent-a', 'start', {}, origin),
  );
  assert.deepEqual(availableAgentActions({ ...order, approvedUrl: '' }), []);
  assert.throws(() => agentTransition(order, 'agent-a', 'pay', {}, origin));
  order = agentTransition(order, 'agent-a', 'start', {}, origin);
  assert.throws(() =>
    agentTransition(order, 'agent-a', 'ready', { quality }, origin),
  );
  assert.throws(() =>
    agentTransition(
      order,
      'agent-a',
      'program',
      { verifiedUrl: origin + '/other', tested: true },
      origin,
    ),
  );
  order = agentTransition(
    order,
    'agent-a',
    'program',
    { verifiedUrl: origin + '/customer', tested: true },
    origin,
  );
  assert.throws(() =>
    agentTransition(
      order,
      'agent-a',
      'ready',
      { quality: { ...quality, condition: false } },
      origin,
    ),
  );
  order = agentTransition(order, 'agent-a', 'ready', { quality }, origin);
  assert.throws(() =>
    agentTransition(
      order,
      'agent-a',
      'deliver',
      { proof: 'Proof 123', customerConfirmed: true },
      origin,
    ),
  );
  order = agentTransition(
    order,
    'agent-a',
    'package',
    { packaged: true },
    origin,
  );
  order = agentTransition(
    order,
    'agent-a',
    'dispatch',
    { courier: 'Approved courier', tracking: 'TRACK-123' },
    origin,
  );
  assert.throws(() =>
    agentTransition(
      order,
      'agent-a',
      'deliver',
      { proof: 'Proof 123' },
      origin,
    ),
  );
  order = agentTransition(
    order,
    'agent-a',
    'deliver',
    { proof: 'Proof 123', customerConfirmed: true },
    origin,
  );
  assert.equal(order.status, 'DELIVERED');
  assert.equal(order.journal.length, 2);
  assert.throws(() =>
    agentTransition(
      order,
      'agent-a',
      'deliver',
      { proof: 'Proof 123', customerConfirmed: true },
      origin,
    ),
  );
});
test('agent payload excludes all financial and private account data', () => {
  const view = agentOrderView(
    {
      ...base(),
      checkoutPlan: { dollars: 100 },
      ownerId: 'private',
      paymentToken: 'private',
    },
    origin,
  );
  for (const key of [
    'amount',
    'cost',
    'journal',
    'checkoutPlan',
    'ownerId',
    'paymentToken',
  ])
    assert.ok(!(key in view), key);
  assert.equal(view.approvedUrl, origin + '/customer');
  assert.equal(
    agentOrderView({ ...base(), paid: false }, origin).design,
    undefined,
  );
});

function sqliteD1(sqlite) {
  return {
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...values) {
          args = values;
          return stmt;
        },
        async first() {
          return sqlite.prepare(sql).get(...args) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...args) };
        },
        async run() {
          const result = sqlite.prepare(sql).run(...args);
          return { meta: { changes: Number(result.changes) } };
        },
      };
      return stmt;
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const stmt of statements) results.push(await stmt.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
const dataModule = (code) =>
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
async function route(file) {
  const dependencies = {
    '@/lib/server-reservations': dataModule(
      'export async function expireReservations(){}',
    ),
    '@/lib/payment-policy': dataModule(
      'export function validatePaymentEvidence(){throw Error("Not used in this agent-only test");}',
    ),
    '@/lib/public-error': dataModule(
      'export function publicError(e){return e.message;}',
    ),
    '@/app/chatgpt-auth': dataModule(
      'export async function getChatGPTUser(){return globalThis.__agentTest.user;}',
    ),
    '@/lib/server-db': dataModule(
      'export function database(){return globalThis.__agentTest.db;}',
    ),
    '@/lib/agent-workflow': new URL('../lib/agent-workflow.ts', import.meta.url)
      .href,
    '@/lib/domain': new URL('../lib/domain.ts', import.meta.url).href,
    '@/lib/server-order-access': dataModule(
      "export async function canManageOrders(){return globalThis.__agentTest.user?.role==='manager';}",
    ),
    '@/lib/server-catalog': dataModule(
      'export async function getProducts(){return [];}',
    ),
    '@/lib/server-plans': dataModule(
      'export async function getManagedPlans(){return [];}',
    ),
    'cloudflare:workers': dataModule(
      "export const env={PROFILE_PHOTOS:{async get(){return {body:'approved artwork',customMetadata:{ownerId:'customer-owner'},httpMetadata:{contentType:'image/png'}};}}};",
    ),
  };
  // File URLs preserve Windows drive paths and spaces.
  dependencies['@/lib/agent-workflow'] = new URL(
    '../lib/agent-workflow.ts',
    import.meta.url,
  ).href;
  const source = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  return import(
    dataModule(
      source.replace(/from ['"]([^'"]+)['"]/g, (whole, id) =>
        dependencies[id] ? `from '${dependencies[id]}'` : whole,
      ),
    )
  );
}
test('database routes isolate agents, persist operations reports, and deliver exactly once', async () => {
  const sql = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(
      readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'),
    );
  for (const id of ['customer-owner', 'manager', 'agent-a', 'agent-b'])
    sql
      .prepare(
        'INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?)',
      )
      .run(
        id,
        id + '@example.com',
        id,
        '!test',
        id === 'manager'
          ? 'manager'
          : id.startsWith('agent')
            ? 'agent'
            : 'customer',
        new Date().toISOString(),
      );
  const user = { userId: 'agent-a', displayName: 'Agent A', role: 'agent' };
  globalThis.__agentTest = { user, db: sqliteD1(sql) };
  const api = await route('../app/api/agent/route.ts');
  const reports = await route('../app/api/agent-reports/route.ts');
  const manager = await route('../app/api/manager/route.ts');
  const assets = await route('../app/api/design-assets/[id]/route.ts');
  const insert = (o) =>
    sql
      .prepare('INSERT INTO sandbox_orders VALUES(?,?,?,?,?)')
      .run(o.id, 'customer-owner', JSON.stringify(o), o.version, o.createdAt);
  insert(base());
  insert({ ...base(), id: 'other-order', agentId: 'agent-b' });
  sql
    .prepare(
      'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id) VALUES(?,?,?,?,?,?,?)',
    )
    .run(
      'opening',
      'pvc',
      2,
      'Allocated',
      'manager',
      new Date().toISOString(),
      'agent-a',
    );
  const req = (payload, path = '/api/agent') =>
    new Request(origin + path, {
      method: 'POST',
      headers: { origin, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  assert.equal(
    (
      await manager.POST(
        req(
          {
            action: 'order',
            orderId: 'order-a',
            version: 1,
            step: 'ready',
            qc: true,
          },
          '/api/manager',
        ),
      )
    ).status,
    403,
  );
  assert.equal((await manager.GET()).status, 403);
  const assetId = crypto.randomUUID();
  const assetRequest = () =>
    assets.GET(new Request(origin + '/api/design-assets/' + assetId), {
      params: Promise.resolve({ id: assetId }),
    });
  assert.equal((await assetRequest()).status, 404);
  sql
    .prepare(
      "UPDATE sandbox_orders SET data_json=json_set(data_json,'$.design.front.assetId',?) WHERE id='order-a'",
    )
    .run(assetId);
  assert.equal((await assetRequest()).status, 200);
  globalThis.__agentTest.user = { ...user, userId: 'agent-b' };
  assert.equal((await assetRequest()).status, 404);
  globalThis.__agentTest.user = user;
  const read = async () =>
    await (await api.GET(new Request(origin + '/api/agent'))).json();
  let data = await read();
  assert.equal(data.orders.length, 1);
  assert.equal(data.stock[0].balance, 2);
  assert.equal(data.stock[0].reserved, 1);
  assert.ok(!('amount' in data.orders[0]));
  assert.equal(
    (
      await api.POST(
        req({
          action: 'order',
          orderId: 'other-order',
          version: 1,
          step: 'start',
        }),
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await api.POST(
        new Request(origin + '/api/agent', {
          method: 'POST',
          headers: { origin: 'https://bad.example' },
          body: '{}',
        }),
      )
    ).status,
    403,
  );
  globalThis.__agentTest.user = { ...user, role: 'customer' };
  assert.equal((await api.GET(new Request(origin + '/api/agent'))).status, 403);
  globalThis.__agentTest.user = user;
  const reportId = crypto.randomUUID();
  const payload = {
    action: 'report',
    id: reportId,
    type: 'direct_payment',
    orderId: 'order-a',
    message: 'Customer attempted payment; redirected to HQ.',
  };
  assert.equal((await api.POST(req(payload))).status, 200);
  assert.equal((await api.POST(req(payload))).status, 409);
  assert.equal((await reports.GET()).status, 403);
  globalThis.__agentTest.user = { userId: 'manager', role: 'manager' };
  const managerReports = await (await reports.GET()).json();
  assert.equal(managerReports.reports[0].id, reportId);
  assert.equal(
    (
      await reports.POST(
        req(
          {
            id: reportId,
            version: 1,
            response: 'HQ contacted customer through official channel.',
          },
          '/api/agent-reports',
        ),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await reports.POST(
        req(
          { id: reportId, version: 1, response: 'Duplicate reply' },
          '/api/agent-reports',
        ),
      )
    ).status,
    409,
  );
  globalThis.__agentTest.user = user;
  data = await read();
  assert.equal(data.reports[0].status, 'resolved');
  assert.match(data.reports[0].response, /HQ/);
  let version = 1;
  for (const [step, fields] of [
    ['start', {}],
    ['program', { verifiedUrl: origin + '/customer', tested: true }],
    ['ready', { quality }],
    ['package', { packaged: true }],
    ['dispatch', { courier: 'Approved courier', tracking: 'TRACK-123' }],
    [
      'deliver',
      { proof: 'Confirmed customer receipt', customerConfirmed: true },
    ],
  ]) {
    const response = await api.POST(
      req({ action: 'order', orderId: 'order-a', version, step, ...fields }),
    );
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    version++;
  }
  assert.equal(
    (
      await api.POST(
        req({
          action: 'order',
          orderId: 'order-a',
          version: 6,
          step: 'deliver',
          proof: 'Repeated receipt',
          customerConfirmed: true,
        }),
      )
    ).status,
    409,
  );
  data = await read();
  assert.equal(data.orders[0].status, 'DELIVERED');
  assert.equal(data.stock[0].balance, 1);
  assert.equal(data.stock[0].reserved, 0);
  assert.equal(
    sql
      .prepare(
        "SELECT COUNT(*) AS n FROM stock_movements WHERE id='delivery-order-a'",
      )
      .get().n,
    1,
  );
  assert.equal(
    sql
      .prepare(
        "SELECT COUNT(*) AS n FROM sandbox_events WHERE order_id='order-a'",
      )
      .get().n,
    6,
  );
  sql.close();
  delete globalThis.__agentTest;
});
