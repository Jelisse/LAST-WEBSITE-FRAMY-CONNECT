import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import {
  analyticsPath,
  analyticsRange,
  cleanReferrer,
  safeCampaign,
  csvCell,
} from '../lib/site-analytics.ts';
import { funnelSQL } from '../lib/site-funnel.ts';
const source = ts.transpileModule(
  readFileSync('app/api/site-analytics/route.ts', 'utf8').replace(
    /^import[\s\S]*?;\r?\n/gm,
    '',
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  },
).outputText;
function fixture() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('drizzle/0013_website_analytics.sql', 'utf8'));
  sql.exec(readFileSync('drizzle/0014_profile_engagement.sql', 'utf8'));
  sql.exec(
    'CREATE TABLE auth_recovery(token_hash TEXT PRIMARY KEY,expires_at INTEGER)',
  );
  sql.exec(
    'CREATE TABLE profile_enquiries(id TEXT PRIMARY KEY,created_at INTEGER)',
  );
  sql.exec(
    'CREATE TABLE sandbox_orders(id TEXT,created_at TEXT,data_json TEXT)',
  );
  const state = { user: null, allowed: true };
  const db = {
    prepare(query) {
      let args = [];
      return {
        bind(...v) {
          args = v;
          return this;
        },
        async first() {
          return sql.prepare(query).get(...args) || null;
        },
        async run() {
          return { meta: sql.prepare(query).run(...args) };
        },
        async execute() {
          const stmt = sql.prepare(query);
          return stmt.columns().length
            ? { results: stmt.all(...args) }
            : { results: [], meta: stmt.run(...args) };
        },
      };
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.execute());
        sql.exec('COMMIT');
        return results;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
  const exports = {};
  // oxlint-disable-next-line typescript/no-implied-eval -- Execute our endpoint with isolated database and auth mocks.
  new Function(
    'exports',
    'database',
    'getChatGPTUser',
    'canManageOrders',
    'tokenHash',
    'rateLimit',
    'analyticsPath',
    'analyticsRange',
    'cleanReferrer',
    'safeCampaign',
    'funnelSQL',
    source,
  )(
    exports,
    () => db,
    async () => state.user,
    async () => state.user?.role === 'manager',
    async (v) => 'hashed:' + v,
    async () => state.allowed,
    analyticsPath,
    analyticsRange,
    cleanReferrer,
    safeCampaign,
    funnelSQL,
  );
  const session = crypto.randomUUID();
  const post = (body = {}, headers = {}) =>
    exports.POST(
      new Request('https://shop.test/api/site-analytics', {
        method: 'POST',
        headers: { origin: 'https://shop.test', ...headers },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          session,
          path: '/',
          kind: 'page',
          consent: true,
          ...body,
        }),
      }),
    );
  return { sql, db, state, post, api: exports, session };
}
test('analytics paths exclude private URLs and query data; referrers retain domains only', () => {
  assert.equal(analyticsPath('/manager'), null);
  assert.equal(analyticsPath('/entrar?email=private'), null);
  assert.equal(analyticsPath('/perfil/person'), null);
  assert.equal(analyticsPath('/encomendar/keychain'), '/encomendar/keychain');
  assert.equal(
    cleanReferrer('https://example.org/private?q=secret'),
    'example.org',
  );
  assert.equal(cleanReferrer('javascript:alert(1)'), 'direct');
  assert.equal(safeCampaign('email@example.org'), '');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
});
test('analytics ranges use Maputo midnight, reject invalid and oversized ranges', () => {
  const r = analyticsRange(
    '2026-09-01',
    '2026-09-02',
    Date.parse('2026-09-03'),
  );
  assert.equal(r.start, Date.parse('2026-08-31T22:00:00Z'));
  assert.equal(r.end, Date.parse('2026-09-02T22:00:00Z'));
  assert.throws(() => analyticsRange('2026-02-30', '2026-03-01'));
  assert.throws(() => analyticsRange('2020-01-01', '2026-09-02'));
  assert.throws(() => analyticsRange('2026-09-03', '2026-09-01'));
});
test('analytics rejects unsafe origin, missing consent and malformed events, excludes bots and staff', async () => {
  const f = fixture();
  try {
    assert.equal(
      (await f.post({}, { origin: 'https://evil.test' })).status,
      403,
    );
    assert.equal((await f.post({ consent: false })).status, 422);
    assert.equal((await f.post({ path: '/manager' })).status, 422);
    assert.equal(
      (await f.post({ kind: 'step', path: '/encomendar/keychain', step: 9 }))
        .status,
      422,
    );
    assert.equal((await f.post({}, { 'user-agent': 'Googlebot' })).status, 200);
    assert.equal((await f.post({}, { dnt: '1' })).status, 200);
    f.state.user = { role: 'manager' };
    await f.post();
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) n FROM site_events').get().n,
      0,
    );
    f.state.user = null;
    f.state.allowed = false;
    assert.equal((await f.post()).status, 429);
  } finally {
    f.sql.close();
  }
});
test('page retries and repeated steps deduplicate while heartbeat does not create pageviews', async () => {
  const f = fixture();
  try {
    const id = crypto.randomUUID();
    await f.post({ id });
    await f.post({ id });
    await f.post({ kind: 'pulse' });
    await f.post({ kind: 'step', path: '/encomendar/keychain', step: 0 });
    await f.post({ kind: 'step', path: '/encomendar/keychain', step: 0 });
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) n FROM site_events').get().n,
      2,
    );
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) n FROM site_sessions').get().n,
      1,
    );
    assert.ok(
      !f.sql
        .prepare('SELECT id FROM site_sessions')
        .get()
        .id.match(/^[0-9a-f-]{36}$/),
    );
  } finally {
    f.sql.close();
  }
});
test('reports require manager access and aggregate real events without session identifiers', async () => {
  const f = fixture();
  try {
    const req = new Request('https://shop.test/api/site-analytics');
    assert.equal((await f.api.GET(req)).status, 403);
    f.state.user = { userId: 'customer', role: 'customer' };
    assert.equal((await f.api.GET(req)).status, 403);
    await f.post();
    f.state.user = { userId: 'manager', role: 'manager' };
    const res = await f.api.GET(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.current.views, 1);
    assert.equal(data.current.sessions, 1);
    assert.equal(data.active[0].value, 1);
    assert.equal(data.funnel.s0, 0);
    assert.equal(JSON.stringify(data).includes(f.session), false);
    assert.equal(
      (
        await f.api.GET(
          new Request('https://shop.test/api/site-analytics?from=invalid'),
        )
      ).status,
      422,
    );
  } finally {
    f.sql.close();
  }
});
test('sequential funnel excludes out of order steps and never merges different products', () => {
  const f = fixture();
  try {
    const insert = f.sql.prepare(
      'INSERT INTO site_events VALUES(?,?,?,?,?,?,NULL,NULL)',
    );
    const add = (session, path, step, at, kind = 'step') =>
      insert.run(crypto.randomUUID(), session, at, kind, path, step);
    for (let step = 0; step < 6; step++)
      add('complete', '/encomendar/keychain', step, 100 + step);
    add('complete', '/encomendar/keychain', -1, 107, 'submitted');
    add('out-of-order', '/encomendar/keychain', 0, 100);
    add('out-of-order', '/encomendar/keychain', 1, 90);
    add('mixed', '/encomendar/keychain', 0, 100);
    add('mixed', '/encomendar/pvc', 1, 101);
    const row = f.sql
      .prepare(funnelSQL)
      .get(0, 1000, 1000, 1000, 1000, 1000, 1000, 1000);
    assert.equal(row.s0, 3);
    assert.equal(row.s1, 1);
    assert.equal(row.s5, 1);
    assert.equal(row.submitted, 1);
  } finally {
    f.sql.close();
  }
});

test('late beacons keep bounded observation timestamps; oversized and malformed payloads are rejected', async () => {
  const f = fixture();
  try {
    const at = Date.now() - 5000;
    await f.post({
      kind: 'step',
      path: '/encomendar/keychain',
      step: 1,
      at: at + 1000,
    });
    await f.post({ kind: 'step', path: '/encomendar/keychain', step: 0, at });
    assert.deepEqual(
      f.sql
        .prepare('SELECT step FROM site_events ORDER BY at')
        .all()
        .map((r) => r.step),
      [0, 1],
    );
    assert.equal((await f.post({ referrer: 'x'.repeat(3000) })).status, 413);
    const malformed = new Request('https://shop.test/api/site-analytics', {
      method: 'POST',
      headers: { origin: 'https://shop.test' },
      body: 'null',
    });
    assert.equal((await f.api.POST(malformed)).status, 422);
    await f.post({ at: 0 });
    assert.ok(
      f.sql.prepare("SELECT at FROM site_events WHERE kind='page'").get().at >
        at,
    );
  } finally {
    f.sql.close();
  }
});

test('scheduled retention removes old analytics without touching recent events or orders', async () => {
  const f = fixture();
  try {
    const now = Date.now(),
      old = now - 91 * 86400000;
    f.sql
      .prepare(
        "INSERT INTO site_sessions VALUES('old',?,?, '/', 'direct','','desktop','MZ')",
      )
      .run(old, old);
    f.sql
      .prepare(
        "INSERT INTO site_events VALUES('old-event','old',?,'page','/',-1,NULL,NULL)",
      )
      .run(old);
    await f.post();
    f.sql.exec(
      "INSERT INTO sandbox_orders VALUES('keep-order','2020-01-01','{}')",
    );
    const code = ts.transpileModule(
      readFileSync('worker.ts', 'utf8').replace(/^import[\s\S]*?;\r?\n/gm, ''),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      },
    ).outputText;
    const exports = {};
    // oxlint-disable-next-line typescript/no-implied-eval -- Isolated scheduled handler with real SQLite.
    new Function(
      'exports',
      'handler',
      'securityHeaders',
      'cleanupReservations',
      'profileReminders',
      'refreshProfileDomains',
      'paymentReceipts',
      code,
    )(
      exports,
      {},
      () => {},
      async () => {},
      async () => {},
      async () => {},
      async () => {},
    );
    const pending = [];
    await exports.default.scheduled(
      {},
      { DB: f.db },
      {
        waitUntil(p) {
          pending.push(p);
        },
      },
    );
    await Promise.all(pending);
    assert.equal(
      f.sql
        .prepare("SELECT COUNT(*) n FROM site_events WHERE id='old-event'")
        .get().n,
      0,
    );
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) n FROM site_events').get().n,
      1,
    );
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) n FROM site_sessions').get().n,
      1,
    );
    assert.equal(
      f.sql.prepare('SELECT COUNT(*) n FROM sandbox_orders').get().n,
      1,
    );
  } finally {
    f.sql.close();
  }
});
