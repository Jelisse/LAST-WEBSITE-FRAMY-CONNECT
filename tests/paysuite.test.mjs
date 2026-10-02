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
    '@/lib/request-limits': moduleURL(
      'export async function rateLimit(){return true;}',
    ),
    '@/app/chatgpt-auth': moduleURL(
      'export async function getChatGPTUser(){return globalThis.__paysuite.user;}',
    ),
    'cloudflare:workers': moduleURL(
      'export const env=new Proxy({}, {get:(_,key)=>globalThis.__paysuite.env[key]});',
    ),
    'next/headers': moduleURL(
      'export async function cookies(){return {get:()=>({value:globalThis.__paysuite.cookie})};}',
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
function fixture(t) {
  const sql = new DatabaseSync(':memory:');
  sql.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync('drizzle')
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sql.exec(readFileSync('drizzle/' + file, 'utf8'));
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
        exec() {
          return {
            meta: { changes: Number(sql.prepare(query).run(...args).changes) },
          };
        },
        async run() {
          return stmt.exec();
        },
      };
      return stmt;
    },
    async batch(stmts) {
      sql.exec('BEGIN');
      try {
        const results = stmts.map((s) => s.exec());
        sql.exec('COMMIT');
        return results;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  const now = new Date().toISOString();
  for (const [id, role] of [
    ['buyer', 'customer'],
    ['other', 'customer'],
    ['manager', 'manager'],
  ])
    sql
      .prepare(
        'INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?)',
      )
      .run(id, id + '@example.test', id, '!', role, now);
  sql
    .prepare(
      "INSERT INTO sandbox_memberships(owner_id,plan_id,version,updated_at,trial_started_at,trial_expires_at) VALUES('buyer','free-30',1,?,?,?)",
    )
    .run(
      now,
      new Date(Date.now() - 31 * 86400000).toISOString(),
      new Date(Date.now() - 86400000).toISOString(),
    );
  sql
    .prepare(
      "INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('buyer','buyer','{}','{}',?)",
    )
    .run(now);
  sql.exec(
    'UPDATE profile_billing_settings SET enabled=1; UPDATE checkout_pricing SET enabled=1',
  );
  for (const [id, amount] of [
    ['pvc', 95000],
    ['keychain', 50000],
  ]) {
    sql
      .prepare(
        'INSERT INTO product_catalog(id,data_json,version,updated_by,updated_at) VALUES(?,?,1,?,?)',
      )
      .run(
        id,
        JSON.stringify({
          amount,
          published: true,
          available: true,
          availabilityConfigured: true,
          configurationPriceConfirmed: true,
          kitAmount: 135000,
        }),
        'manager',
        now,
      );
    sql
      .prepare(
        'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at) VALUES(?,?,100,?,?,?)',
      )
      .run('ps-test-' + id, id, 'test', 'manager', now);
  }
  const env = {
    DB: db,
    PAYSUITE_ENABLED: 'true',
    PUBLIC_SITE_URL: 'https://framyconnect.co.mz',
    PAYSUITE_API_TOKEN: 'test-only-fake-token',
    PAYSUITE_WEBHOOK_SECRET: 'test-only-signing-secret',
  };
  globalThis.__paysuite = { env, user: { userId: 'buyer', role: 'customer' } };
  const records = new Map();
  let creates = 0;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).startsWith('https://paysuite.tech/api/v1/payments'));
    assert.equal(options.headers.Authorization, 'Bearer test-only-fake-token');
    if (options.method === 'POST') {
      creates++;
      const body = JSON.parse(options.body);
      const id = '01H' + String(creates).padStart(23, '0');
      const record = {
        ...body,
        id,
        status: 'pending',
        checkout_url: 'https://paysuite.tech/checkout/' + id,
      };
      records.set(id, record);
      return Response.json(
        { status: 'success', data: record },
        { status: 201 },
      );
    }
    const id = String(url).split('/').at(-1);
    assert.ok(records.has(id));
    return Response.json({ status: 'success', data: records.get(id) });
  };
  t.after(() => {
    globalThis.fetch = oldFetch;
    sql.close();
  });
  return { sql, db, env, records, creates: () => creates };
}
function request(body) {
  return new Request('https://framyconnect.co.mz/api/paysuite/checkout', {
    method: 'POST',
    headers: {
      Origin: 'https://framyconnect.co.mz',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
function product(overrides = {}) {
  return {
    kind: 'product',
    format: 'kit',
    card: 'PVC',
    keychain: 'PVC + epóxi',
    design: 'standard',
    delivery: 'standard',
    city: 'maputo',
    contact: '+258840000000',
    address: 'Maputo, rua de teste 123',
    expectedAmount: 155000,
    pricingVersion: 0,
    accepted: true,
    method: 'mpesa',
    requestId: crypto.randomUUID(),
    ...overrides,
  };
}
async function notify(f, id, event = 'payment.success', overrides = {}) {
  const record = f.records.get(id);
  const raw = JSON.stringify({
    event,
    data: {
      id,
      reference: record.reference,
      amount: record.amount,
      ...overrides,
    },
  });
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(f.env.PAYSUITE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = Buffer.from(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)),
  ).toString('hex');
  return (await api('app/api/paysuite/webhook/route.ts')).POST(
    new Request('https://framyconnect.co.mz/api/paysuite/webhook', {
      method: 'POST',
      headers: { 'X-Signature': signature },
      body: raw,
    }),
  );
}
test('PaySuite product checkout -> hosted payment -> signed webhook -> paid is idempotent and reserves both kit items', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  const body = product();
  const created = await route.POST(request(body));
  assert.equal(created.status, 200, await created.clone().text());
  const result = await created.json();
  assert.equal(result.status, 'pending');
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM paysuite_stock_reservations').get().n,
    2,
  );
  await route.POST(request(body));
  assert.equal(f.creates(), 1);
  const [id, record] = [...f.records][0];
  record.status = 'paid';
  assert.equal((await notify(f, id)).status, 204);
  assert.equal((await notify(f, id)).status, 204);
  assert.equal(
    f.sql
      .prepare('SELECT status FROM paysuite_product_orders WHERE id=?')
      .get(body.requestId).status,
    'paid',
  );
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM paysuite_events').get().n,
    1,
  );
  // A delayed failed event cannot undo a verified paid transaction.
  assert.equal((await notify(f, id, 'payment.failed')).status, 204);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'paid',
  );
  globalThis.__paysuite.user = { userId: 'other', role: 'customer' };
  assert.equal(
    (
      await route.GET(
        new Request(
          'https://framyconnect.co.mz/api/paysuite/checkout?payment=' +
            result.paymentId,
        ),
      )
    ).status,
    404,
  );
});
test('PaySuite rejects forged webhooks, changed amounts, unsupported delivery and out-of-stock checkout', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  assert.equal(
    (await route.POST(request(product({ expectedAmount: 1 })))).status,
    422,
  );
  assert.equal(
    (await route.POST(request(product({ delivery: 'other' })))).status,
    422,
  );
  assert.equal(f.creates(), 0);
  const body = product();
  assert.equal((await route.POST(request(body))).status, 200);
  const [id, record] = [...f.records][0];
  record.status = 'paid';
  record.amount = '1.00';
  assert.equal((await notify(f, id)).status, 503);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'pending',
  );
  const webhook = await api('app/api/paysuite/webhook/route.ts');
  assert.equal(
    (
      await webhook.POST(
        new Request('https://framyconnect.co.mz/api/paysuite/webhook', {
          method: 'POST',
          headers: { 'X-Signature': '0'.repeat(64) },
          body: '{}',
        }),
      )
    ).status,
    401,
  );
  f.sql.exec("DELETE FROM stock_movements WHERE product_id='pvc'");
  assert.equal((await route.POST(request(product()))).status, 422);
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM paysuite_product_orders').get().n,
    1,
  );
});
test('failed PaySuite payments release stock once; late success is held for review', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  await route.POST(request(product()));
  const [id, record] = [...f.records][0];
  record.status = 'failed';
  assert.equal((await notify(f, id, 'payment.failed')).status, 204);
  await notify(f, id, 'payment.failed');
  assert.equal(
    f.sql
      .prepare(
        "SELECT COUNT(*) n FROM stock_movements WHERE id LIKE 'ps-release-%'",
      )
      .get().n,
    2,
  );
  record.status = 'paid';
  await notify(f, id);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'review',
  );
});
test('annual and monthly subscription checkout waits for trial end and extends access exactly once', async (t) => {
  const f = fixture(t);
  const route = await api('app/api/paysuite/checkout/route.ts');
  f.sql
    .prepare(
      'UPDATE sandbox_memberships SET trial_started_at=?,trial_expires_at=?',
    )
    .run(
      new Date().toISOString(),
      new Date(Date.now() + 30 * 86400000).toISOString(),
    );
  const body = {
    kind: 'subscription',
    planId: 'personal',
    planVersion: 0,
    cycle: 'annual',
    expectedAmount: 100000,
    accepted: true,
    method: 'credit_card',
    requestId: crypto.randomUUID(),
  };
  assert.equal((await route.POST(request(body))).status, 422);
  assert.equal(f.creates(), 0);
  f.sql
    .prepare(
      'UPDATE sandbox_memberships SET trial_started_at=?,trial_expires_at=?',
    )
    .run(
      new Date(Date.now() - 31 * 86400000).toISOString(),
      new Date(Date.now() - 86400000).toISOString(),
    );
  const created = await route.POST(request(body));
  assert.equal(created.status, 200, await created.clone().text());
  const [id, record] = [...f.records][0];
  record.status = 'paid';
  await Promise.all([notify(f, id), notify(f, id)]);
  const end = f.sql
    .prepare('SELECT paid_expires_at FROM sandbox_memberships')
    .get().paid_expires_at;
  assert.ok(Date.parse(end) > Date.now() + 364 * 86400000);
  await Promise.all([notify(f, id), notify(f, id)]);
  assert.equal(
    f.sql.prepare('SELECT paid_expires_at FROM sandbox_memberships').get()
      .paid_expires_at,
    end,
  );
  assert.equal(
    f.sql.prepare('SELECT COUNT(*) n FROM profile_receipts').get().n,
    1,
  );
  const next = {
    ...body,
    requestId: crypto.randomUUID(),
    cycle: 'monthly',
    expectedAmount: 10000,
  };
  assert.equal((await route.POST(request(next))).status, 200);
  const [nextId, nextRecord] = [...f.records][1];
  nextRecord.status = 'paid';
  await notify(f, nextId);
  assert.ok(
    Date.parse(
      f.sql.prepare('SELECT next_expires_at FROM sandbox_memberships').get()
        .next_expires_at,
    ) >
      Date.parse(end) + 27 * 86400000,
  );
});
test('ambiguous provider timeout does not create another payment on retry', async (t) => {
  const f = fixture(t),
    route = await api('app/api/paysuite/checkout/route.ts');
  const transport = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (...args) => {
    calls++;
    await transport(...args);
    throw Error('timeout');
  };
  const body = product();
  assert.equal((await route.POST(request(body))).status, 202);
  assert.equal((await route.POST(request(body))).status, 200);
  assert.equal(calls, 1);
  assert.equal(
    f.sql.prepare('SELECT status FROM paysuite_payments').get().status,
    'creating',
  );
});
test('only verified paid orders can be fulfilled and the customer sees the delivery state', async (t) => {
  const f = fixture(t), checkout = await api('app/api/paysuite/checkout/route.ts'), manager = await api('app/api/paysuite/manager/route.ts');
  const buyer = globalThis.__paysuite.user;
  const body = product();
  assert.equal((await checkout.POST(request(body))).status, 200);
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 403);
  globalThis.__paysuite.user = { userId: 'manager-test', role: 'manager' };
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 409);
  const [id, record] = [...f.records][0]; record.status = 'paid';
  await notify(f, id);
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 200);
  assert.equal((await manager.POST(request({ action: 'fulfilled', id: body.requestId }))).status, 409);
  globalThis.__paysuite.user = buyer;
  const status = await (await checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout?payment=' + body.requestId))).json();
  assert.equal(status.status, 'paid'); assert.equal(status.orderStatus, 'fulfilled');
  assert.equal(status.configuration_json, undefined);
  const list = await (await checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout'))).json();
  assert.equal(list.payments[0].orderStatus, 'fulfilled');
});

test('provider URL validation and calendar billing handle security and leap years', async () => {
  const { checkoutURL, billingPeriodEnd, minorAmount } =
    await import('../lib/paysuite.ts');
  for (const url of [
    'https://paysuite.tech.evil.test/checkout/x',
    'http://paysuite.tech/checkout/x',
    'https://user:pass@paysuite.tech/checkout/x',
    'https://paysuite.tech:444/checkout/x',
  ])
    assert.throws(() => checkoutURL(url));
  assert.equal(
    billingPeriodEnd('2024-02-29T12:00:00.000Z', 'annual'),
    '2025-02-28T12:00:00.000Z',
  );
  assert.equal(
    billingPeriodEnd('2026-01-31T12:00:00.000Z', 'monthly'),
    '2026-02-28T12:00:00.000Z',
  );
  assert.equal(minorAmount('100.50'), 10050);
  assert.throws(() => minorAmount('1.001'));
});

test('custom annual-only plan checks out and preserves effective terms when scheduling a later renewal', async(t)=>{
 const f=fixture(t),route=await api('app/api/paysuite/checkout/route.ts');
 const plan={id:'plan-custom',name:'Custom',audience:'Creators',description:'Custom',active:true,meticais:150,annualMeticais:1500,links:12,bio:400,entitlementVersion:1,features:{whatsapp:false,location:false,showcase:true,enquiries:false,english:false,analytics:true,teams:false,domain:false},monthlyEnabled:false,annualEnabled:true};
 f.sql.prepare("INSERT INTO manager_records(id,kind,data_json,version,updated_at) VALUES(?,'plan',?,1,?)").run(plan.id,JSON.stringify(plan),new Date().toISOString());
 const base={kind:'subscription',planId:plan.id,planVersion:1,accepted:true,method:'credit_card',requestId:crypto.randomUUID(),cycle:'monthly',expectedAmount:15000};
 assert.equal((await route.POST(request(base))).status,422);
 const body={...base,cycle:'annual',expectedAmount:150000};assert.equal((await route.POST(request(body))).status,200);
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 assert.equal(f.sql.prepare('SELECT plan_id FROM profile_membership_view').get().plan_id,plan.id);
 // Model a previous scheduled change that has already become effective.
 const start=new Date(Date.now()-86400000).toISOString(),end=new Date(Date.now()+20*86400000).toISOString();
 f.sql.prepare("UPDATE sandbox_memberships SET plan_id='personal',terms_json='{}',next_plan_id=?,next_terms_json=?,next_starts_at=?,next_expires_at=?").run(plan.id,JSON.stringify(plan),start,end);
 assert.equal((await route.POST(request({...body,requestId:crypto.randomUUID()}))).status,200);
 const [nextId,nextRecord]=[...f.records][1];nextRecord.status='paid';await notify(f,nextId);
 const member=f.sql.prepare('SELECT * FROM profile_membership_view').get();assert.equal(member.plan_id,plan.id);assert.equal(JSON.parse(member.terms_json).features.analytics,true);assert.equal(member.paid_expires_at,end);assert.ok(member.next_starts_at>=end);
});


test('products can be paid before profile creation; only the owner publication attaches the paid order', async (t) => {
 const f = fixture(t), checkout = await api('app/api/paysuite/checkout/route.ts'), manager = await api('app/api/paysuite/manager/route.ts');
 f.sql.exec("DELETE FROM profiles WHERE owner_id='buyer'");
 const body = product();
 assert.equal((await checkout.POST(request(body))).status,200);
 const config = () => JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders WHERE id=?').get(body.requestId).configuration_json);
 assert.equal(config().profileUsername,null);
 const [id,record] = [...f.records][0]; record.status='paid'; await notify(f,id);
 const status = () => checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout?payment='+body.requestId));
 assert.equal((await (await status()).json()).profileReady,false);
 const buyer=globalThis.__paysuite.user;
 globalThis.__paysuite.user={userId:'manager',role:'manager'};
 assert.equal((await manager.POST(request({action:'fulfilled',id:body.requestId}))).status,409);
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('other','other','{}','{}',?)").run(new Date().toISOString());
 assert.equal(config().profileUsername,null);
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('buyer','buyer','{}',NULL,?)").run(new Date().toISOString());
 assert.equal(config().profileUsername,null);
 f.sql.prepare("UPDATE profiles SET published_json=? WHERE owner_id='buyer'").run(JSON.stringify({username:'buyer',name:'Cliente'}));
 assert.equal(config().profileUsername,'buyer'); assert.equal(config().profileSnapshot.name,'Cliente');
 f.sql.prepare("UPDATE profiles SET published_json=? WHERE owner_id='buyer'").run(JSON.stringify({username:'buyer',name:'Actualizado'}));
 assert.equal(config().profileSnapshot.name,'Cliente'); // preserve production snapshot
 assert.equal((await manager.POST(request({action:'fulfilled',id:body.requestId}))).status,200);
 globalThis.__paysuite.user=buyer;
 assert.equal((await (await status()).json()).profileReady,true);
});

test('profile published while payment is pending is attached only after verified payment', async (t) => {
 const f=fixture(t), checkout=await api('app/api/paysuite/checkout/route.ts');
 f.sql.exec("DELETE FROM profiles WHERE owner_id='buyer'");
 const body=product({format:'keychain',expectedAmount:70000});
 assert.equal((await checkout.POST(request(body))).status,200);
 f.sql.prepare("INSERT INTO profiles(owner_id,username,draft_json,published_json,updated_at) VALUES('buyer','buyer','{}','{}',?)").run(new Date().toISOString());
 const config=()=>JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json);
 assert.equal(config().profileUsername,null);
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 assert.equal(config().profileUsername,'buyer');
 assert.equal(config().format,'keychain');
});


test('verified payments queue a detailed immutable email receipt, send once and retry safely', async (t) => {
 const f=fixture(t), checkout=await api('app/api/paysuite/checkout/route.ts');
 const {paymentReceipts}=await api('lib/payment-receipts.ts');
 const body=product(); await checkout.POST(request(body));
 assert.equal(f.sql.prepare('SELECT count(*) n FROM payment_email_receipts').get().n,0);
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);await notify(f,id);
 assert.equal(f.sql.prepare('SELECT count(*) n FROM payment_email_receipts').get().n,1);
 const now=Date.now(), requests=[];let succeed=false;
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');requests.push(options);if(!succeed)throw Error('ambiguous timeout');return Response.json({id:'test-message'});};
 f.env.RESEND_API_KEY='test-only';f.env.PROFILE_EMAIL_FROM='Framy Connect <info@example.test>';
 await paymentReceipts(f.env,body.requestId,now);
 assert.equal(f.sql.prepare('SELECT status FROM payment_email_receipts').get().status,'pending');
 f.sql.exec("UPDATE auth_accounts SET name='Changed',email='changed@example.test' WHERE id='buyer'");
 succeed=true;await Promise.all([paymentReceipts(f.env,body.requestId,now+16*60000),paymentReceipts(f.env,body.requestId,now+16*60000)]);
 assert.equal(requests.length,2);assert.equal(requests[0].body,requests[1].body);assert.equal(requests[0].headers['Idempotency-Key'],requests[1].headers['Idempotency-Key']);
 const mail=JSON.parse(requests[1].body);assert.deepEqual(mail.to,['buyer@example.test']);assert.match(mail.text,/Produtos: 1350,00 MT/);assert.match(mail.text,/Entrega: 200,00 MT/);assert.match(mail.text,/Total pago: 1550,00 MT/);assert.match(mail.text,/não substitui a factura fiscal/);assert.match(mail.text,/perfil\?pagamento=/);
 assert.equal(f.sql.prepare('SELECT status FROM payment_email_receipts').get().status,'sent');
 await paymentReceipts(f.env,body.requestId,now+20*60000);assert.equal(requests.length,2);
});

test('receipt retries stop before provider deduplication expires without changing the payment', async(t)=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts');const body=product();await checkout.POST(request(body));const[id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 const now=Date.now();f.sql.prepare('UPDATE payment_email_receipts SET first_attempt_at=?,attempted_at=?').run(now-24*3600000,now-24*3600000);
 f.env.RESEND_API_KEY='test-only';f.env.PROFILE_EMAIL_FROM='info@example.test';globalThis.fetch=()=>{throw Error('must not resend');};
 await (await api('lib/payment-receipts.ts')).paymentReceipts(f.env,undefined,now);
 assert.equal(f.sql.prepare('SELECT status FROM payment_email_receipts').get().status,'review');assert.equal(f.sql.prepare('SELECT status FROM paysuite_payments').get().status,'paid');
});

test('approved base prices and kit discount flow through configuration plus delivery and design',async()=>{
 const {products}=await api('lib/catalog.ts');const {configurationQuote}=await api('lib/checkout-pricing.ts');
 const catalogue=products.map(p=>({...p,available:true,published:true}));const {fulfilmentDefaults}=await api('lib/fulfilment.ts');const settings={customer_design:15000,team_design:40000,maputo_delivery:20000,fulfilment_json:JSON.stringify(fulfilmentDefaults)};
 const quote=overrides=>configurationQuote(catalogue,settings,{format:'kit',card:'PVC',keychain:'PVC + epóxi',design:'standard',delivery:'standard',city:'maputo',...overrides});
 assert.equal(quote({format:'card'}).hardware,95000);assert.equal(quote({format:'keychain'}).hardware,50000);assert.equal(quote({}).hardware,95000+50000-10000);assert.equal(quote({}).total,155000);
 assert.equal(quote({format:'card',card:'Madeira',design:'customer'}).total,100000+15000+20000);
 assert.equal(quote({format:'card',card:'Metal',design:'team'}).total,150000+40000+20000);
 assert.equal(quote({format:'keychain',keychain:'Couro'}).total,120000+20000);
});


test('pickup is free, needs no customer address and snapshots the selected point for the receipt', async(t)=>{
 const f=fixture(t),checkout=await api('app/api/paysuite/checkout/route.ts');
 const body=product({delivery:'pickup',pickupPoint:'mahota',address:'',expectedAmount:135000});
 assert.equal((await checkout.POST(request(body))).status,200);
 const order=JSON.parse(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json);
 assert.equal(order.delivery,0);assert.equal(order.fulfilment.point.id,'mahota');assert.match(order.address,/Mahota/);assert.equal(order.fulfilment.mode,'pickup');
 const [id,record]=[...f.records][0];record.status='paid';await notify(f,id);
 const receipt=JSON.parse(f.sql.prepare('SELECT payload_json FROM payment_email_receipts').get().payload_json);
 const {receiptMessage}=await api('lib/payment-receipts.ts');assert.match(receiptMessage(receipt),/Levantamento gratuito/);assert.doesNotMatch(receiptMessage(receipt),/Entrega: 0/);
 const result=await(await checkout.GET(new Request('https://framyconnect.co.mz/api/paysuite/checkout?payment='+body.requestId))).json();assert.equal(result.fulfilment.point.id,'mahota');
});

test('delivery settings enforce manager access, stale-write protection, coverage and server-side repricing',async(t)=>{
 const f=fixture(t),route=await api('app/api/manager-delivery/route.ts'),checkout=await api('app/api/paysuite/checkout/route.ts');
 assert.equal((await route.GET()).status,403);
 assert.equal((await route.POST(request({}))).status,403);
 const buyer=globalThis.__paysuite.user;globalThis.__paysuite.user={userId:'manager',role:'manager'};
 const initial=await(await route.GET()).json();initial.settings.cities.find(c=>c.id==='maputo').standardFee=30000;
 assert.equal((await route.POST(request(initial))).status,200);assert.equal((await route.POST(request(initial))).status,409);
 globalThis.__paysuite.user=buyer;
 assert.equal((await checkout.POST(request(product()))).status,422);
 assert.equal((await checkout.POST(request(product({delivery:'express',pricingVersion:1})))).status,422);
 assert.equal((await checkout.POST(request(product({delivery:'pickup',city:'beira',pickupPoint:'mahota',pricingVersion:1,expectedAmount:135000})))).status,422);
 const body=product({pricingVersion:1,expectedAmount:165000});assert.equal((await checkout.POST(request(body))).status,200);
 const before=f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json;
 globalThis.__paysuite.user={userId:'manager',role:'manager'};initial.settings.points[0].address='Novo endereço de levantamento';
 assert.equal((await route.POST(request({...initial,version:1}))).status,200);assert.equal(f.sql.prepare('SELECT configuration_json FROM paysuite_product_orders').get().configuration_json,before);
});
