// Isolated LOCAL integration/load test. Never accepts a remote target or real account.
// Run after build:cloudflare: node tests/load-shopping.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { hash } from 'bcryptjs';

const run = randomUUID();
const integrityOnly = process.argv.includes('--integrity-only');
const directory = `tmp/performance/load-${run}`;
const persistence = `${directory}/state`;
await mkdir(directory, { recursive: true });
const wrangler = 'node_modules/wrangler/bin/wrangler.js';
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const now = new Date().toISOString();
const expiry = new Date(Date.now() + 29 * 86400000).toISOString();
const password = `Local-only-${run}`;
const passwordHash = await hash(password, 12);
let sql = '';
for (const name of (await readdir('drizzle'))
  .filter((f) => f.endsWith('.sql'))
  .sort())
  sql += (await readFile(`drizzle/${name}`, 'utf8')) + '\n';
const customers = Array.from({ length: 410 }, (_, index) => ({
  id: `load-${run}-${index}`,
  email: `load-${run}-${index}@example.test`,
  ip: `198.18.${Math.floor(index / 250)}.${(index % 250) + 1}`,
}));
for (const [index, customer] of customers.entries()) {
  const profile = {
    name: 'Local load test',
    username: `load_${run.replaceAll('-', '').slice(0, 12)}_${index}`,
    title: '',
    email: customer.email,
    phone: '',
    website: '',
    showEmail: false,
    showPhone: false,
    links: [],
    bio: '',
    photoUrl: '',
    photoPosition: 35,
  };
  sql += `INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(${[customer.id, customer.email, 'Local load test', passwordHash, 'customer', now].map(sqlString).join(',')});\n`;
  sql += `INSERT INTO profiles(owner_id,username,draft_json,version,updated_at) VALUES(${[customer.id, profile.username, JSON.stringify(profile)].map(sqlString).join(',')},1,${sqlString(now)});\n`;
  sql += `INSERT INTO sandbox_memberships(owner_id,plan_id,version,updated_at,trial_started_at,trial_expires_at) VALUES(${sqlString(customer.id)},'free-30',1,${[now, now, expiry].map(sqlString).join(',')});\n`;
}
sql +=
  "UPDATE product_options SET quantity=2000,enabled=1 WHERE id='tiktok';\nUPDATE product_options SET quantity=1,enabled=1 WHERE id='instagram';\n";
sql += `INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at) VALUES('load-stock','keychain',2000,'Isolated load test','local-test',${sqlString(now)});\n`;
await writeFile(`${directory}/seed.sql`, sql);
function execute(file) {
  return execFileSync(
    process.execPath,
    [
      wrangler,
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      'wrangler.jsonc',
      '--persist-to',
      persistence,
      '--file',
      file,
      '--json',
    ],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
  );
}
execute(`${directory}/seed.sql`);
const portFinder = createServer();
await new Promise((resolve) => portFinder.listen(0, '127.0.0.1', resolve));
const port = portFinder.address().port;
await new Promise((resolve) => portFinder.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    wrangler,
    'dev',
    '--config',
    'dist/server/wrangler.json',
    '--persist-to',
    persistence,
    '--port',
    String(port),
    '--compatibility-date',
    '2026-05-22',
    '--inspector-port',
    '0',
    '--log-level',
    'error',
  ],
  { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
);
let serverLog = '';
server.stdout.on('data', (chunk) => {
  serverLog += chunk;
});
server.stderr.on('data', (chunk) => {
  serverLog += chunk;
});
const measurements = [];
let stage = 'startup';
const report = {
  run,
  target: base,
  kind: 'local HTTP integration; not a Cloudflare capacity certification',
  stages: [],
  failures: [],
};
async function request(path, customer, body) {
  const started = performance.now();
  let status = 0;
  try {
    const response = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        origin: base,
        'content-type': 'application/json',
        cookie: customer?.cookie ?? '',
        'cf-connecting-ip': customer?.ip ?? '198.19.0.1',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(120000),
      redirect: 'error',
    });
    status = response.status;
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { response, data };
  } finally {
    measurements.push({
      stage,
      path,
      method: body ? 'POST' : 'GET',
      status,
      ms: Math.round(performance.now() - started),
    });
  }
}
function orderBody(option = 'tiktok') {
  return {
    action: 'submit-order',
    checkout: true,
    approveProfile: true,
    id: randomUUID(),
    productId: 'keychain',
    planId: 'free-30',
    planVersion: 0,
    profileVersion: 1,
    design: { optionId: option },
    deliveryCity: 'Maputo',
    deliveryAddress: 'Local load test only',
    deliveryContact: '+258840000000',
  };
}
async function login(customer) {
  const result = await request('/api/auth', customer, {
    action: 'login',
    email: customer.email,
    password,
  });
  assert.equal(
    result.response.status,
    200,
    `Login: ${JSON.stringify(result.data)}`,
  );
  customer.cookie = result.response.headers.get('set-cookie').split(';')[0];
}
function summarise(name, count) {
  const groups = {};
  for (const row of measurements.filter((m) => m.stage === name)) {
    const key = `${row.method} ${row.path}`;
    (groups[key] ??= []).push(row);
  }
  const summary = { name, simultaneousShoppers: count, requests: {} };
  for (const [key, rows] of Object.entries(groups)) {
    const sorted = rows.map((r) => r.ms).sort((a, b) => a - b);
    summary.requests[key] = {
      count: rows.length,
      p50: sorted[Math.ceil(sorted.length * 0.5) - 1],
      p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
      max: sorted.at(-1),
      statuses: rows.reduce(
        (all, row) => ({ ...all, [row.status]: (all[row.status] ?? 0) + 1 }),
        {},
      ),
    };
  }
  report.stages.push(summary);
  console.log(JSON.stringify(summary));
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null)
      throw Error('Local server exited: ' + serverLog.slice(-2000));
    try {
      ready = (
        await fetch(base + '/api/product-options', {
          signal: AbortSignal.timeout(1000),
        })
      ).ok;
    } catch {
      /* Starting. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Local server did not start');
  const assets = JSON.parse(
    await readFile('lib/responsive-images.json', 'utf8'),
  );
  const assetResponse = await fetch(
    base + assets['/products/keychain-transparent.png'].src,
  );
  assert.match(assetResponse.headers.get('cache-control'), /public.*immutable/);
  await assetResponse.arrayBuffer();
  // Warm route modules before measuring sustained concurrency.
  for (const path of ['/', '/produtos', '/encomendar/keychain'])
    assert.equal((await request(path)).response.status, 200);
  let offset = 0;
  for (const count of integrityOnly ? [] : [20, 50, 100, 200]) {
    stage = `shopping-${count}`;
    const results = await Promise.allSettled(
      customers.slice(offset, offset + count).map(async (customer) => {
        for (const path of ['/', '/produtos', '/encomendar/keychain'])
          assert.equal(
            (await request(path, customer)).response.status,
            200,
            path,
          );
        await login(customer);
        assert.equal(
          (await request('/api/workspace', customer)).response.status,
          200,
        );
        const body = orderBody();
        const placed = await request('/api/workspace', customer, body);
        assert.equal(
          placed.response.status,
          200,
          `Checkout: ${JSON.stringify(placed.data)}`,
        );
        // Same order submitted twice concurrently must not reserve twice.
        for (const retry of await Promise.all([
          request('/api/workspace', customer, body),
          request('/api/workspace', customer, body),
        ]))
          assert.equal(retry.response.status, 200, 'Idempotent retry');
      }),
    );
    for (const failure of results.filter((r) => r.status === 'rejected'))
      report.failures.push({ stage, error: String(failure.reason) });
    summarise(stage, count);
    offset += count;
    if (report.failures.length)
      throw Error(
        'Load stage failed; inspect report before increasing concurrency.',
      );
  }
  // Two independent races: last design option and last physical unit.
  for (const mode of ['option', 'physical']) {
    const group = customers.slice(offset, offset + 20);
    for (const customer of group) await login(customer);
    if (mode === 'physical') {
      const adjustment = `${directory}/last-physical.sql`;
      await writeFile(
        adjustment,
        "INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at) SELECT 'last-physical','keychain',(SELECT COUNT(*) FROM sandbox_orders WHERE json_extract(data_json,'$.status')='PENDING_PAYMENT')+1-(SELECT SUM(quantity) FROM stock_movements WHERE product_id='keychain'),'Local last-item race','local-test',datetime('now');",
      );
      execute(adjustment);
    }
    stage = `last-${mode}`;
    const results = await Promise.all(
      group.map((customer) =>
        request(
          '/api/workspace',
          customer,
          orderBody(mode === 'option' ? 'instagram' : 'tiktok'),
        ),
      ),
    );
    assert.equal(
      results.filter((r) => r.response.status === 200).length,
      1,
      'Exactly one last-item winner',
    );
    assert.equal(
      results.filter((r) => r.response.status === 409).length,
      19,
      'Other shoppers receive stock conflict',
    );
    summarise(stage, 20);
    offset += 20;
  }
  const verify = `${directory}/verify.sql`;
  await writeFile(
    verify,
    "SELECT COUNT(*) AS orders,COUNT(DISTINCT id) AS uniqueOrders FROM sandbox_orders; SELECT id,quantity FROM product_options WHERE id IN ('tiktok','instagram'); SELECT COUNT(*) AS createdEvents FROM sandbox_events WHERE action='created'; SELECT COUNT(*) AS payments FROM payment_records;",
  );
  const verification = JSON.parse(execute(verify));
  assert.equal(verification[0].results[0].orders, integrityOnly ? 2 : 372);
  assert.equal(
    verification[0].results[0].uniqueOrders,
    integrityOnly ? 2 : 372,
  );
  assert.equal(
    verification[1].results.find((r) => r.id === 'tiktok').quantity,
    integrityOnly ? 1999 : 1629,
  );
  assert.equal(
    verification[1].results.find((r) => r.id === 'instagram').quantity,
    0,
  );
  assert.equal(
    verification[2].results[0].createdEvents,
    integrityOnly ? 2 : 372,
  );
  assert.equal(verification[3].results[0].payments, 0);
  report.integrity = verification.map((r) => r.results);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failures.push({ stage, error: String(error) });
  process.exitCode = 1;
} finally {
  if (server.exitCode === null && server.pid) {
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      } catch {
        server.kill();
      }
    } else server.kill();
  }
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await writeFile(`${directory}/requests.json`, JSON.stringify(measurements));
  await writeFile(`${directory}/server.log`, serverLog);
  console.log(`Results: ${directory}/report.json; passed=${report.passed}`);
}
