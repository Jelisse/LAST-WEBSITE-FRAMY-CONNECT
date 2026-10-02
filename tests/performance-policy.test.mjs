import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

function load(file, dependencies) {
  const source = readFileSync(file, 'utf8')
    .replace(/^import[\s\S]*?;\r?\n/gm, '')
    .replace(/^export \{[^}]+\} from [^;]+;\r?\n/gm, '');
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  // oxlint-disable-next-line typescript/no-implied-eval -- Exercise production policy with controlled dependencies.
  new Function('exports', ...Object.keys(dependencies), code)(
    exports,
    ...Object.values(dependencies),
  );
  return exports;
}

void test('reservation maintenance shares concurrent work, throttles reads, and keeps forced checkout checks fresh', async () => {
  const db = {};
  let calls = 0;
  let finish;
  const { expireReservations } = load('lib/server-reservations.ts', {
    database: () => db,
    cleanupReservations: async () => {
      calls++;
      await new Promise((resolve) => {
        finish = resolve;
      });
    },
  });
  const pending = Array.from({ length: 200 }, () => expireReservations(false));
  assert.equal(calls, 1);
  finish();
  await Promise.all(pending);
  await expireReservations(false);
  assert.equal(calls, 1);
  const checkout = expireReservations(true);
  assert.equal(calls, 2);
  finish();
  await checkout;
});

void test('failed reservation maintenance can retry immediately', async () => {
  const db = {};
  let calls = 0;
  const { expireReservations } = load('lib/server-reservations.ts', {
    database: () => db,
    cleanupReservations: async () => {
      if (++calls === 1) throw Error('Database unavailable');
    },
  });
  await assert.rejects(expireReservations(false), /Database unavailable/);
  await expireReservations(false);
  assert.equal(calls, 2);
});

void test('worker preserves private cache policy and logs only route categories on failures', async () => {
  const logs = [];
  const { default: worker } = load('worker.ts', {
    handler: {
      fetch: async () =>
        new Response('private', {
          status: 503,
          headers: { 'Cache-Control': 'private, no-store' },
        }),
    },
    securityHeaders: () => {},
    localizedResponse: async (_request, response) => response,
    cleanupReservations: async () => {},
    customDomainRequest: async (request) => request,
    console: { warn: (value) => logs.push(value) },
  });
  const response = await worker.fetch(
    new Request('https://shop.test/customer-secret?token=secret', {
      headers: { cookie: 'private-cookie' },
    }),
    {},
    {},
  );
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.match(response.headers.get('Server-Timing'), /^app;dur=\d+$/);
  assert.equal(response.status, 503);
  assert.equal(await response.text(), 'private');
  assert.equal(JSON.parse(logs[0]).route, 'page');
  assert.doesNotMatch(logs[0], /secret|cookie/);
});

void test('responsive asset manifest contains existing fingerprinted files and only public bundled images', () => {
  const manifest = JSON.parse(
    readFileSync('lib/responsive-images.json', 'utf8'),
  );
  assert.ok(manifest['/products/keychain-transparent.png']);
  for (const [source, entry] of Object.entries(manifest)) {
    assert.match(source, /^\/(home|products|brand)\//);
    for (const variant of entry.srcSet.split(', ')) {
      const [path, width] = variant.split(' ');
      assert.match(
        path,
        /^\/media-optimized\/[a-z0-9-]+-\d+-[a-f0-9]{12}\.webp$/,
      );
      assert.match(width, /^\d+w$/);
      assert.ok(existsSync('public' + path), path);
    }
  }
  assert.equal(
    readFileSync('public/_headers', 'utf8').replaceAll('\r', '').trim(),
    '/media-optimized/*\n  Cache-Control: public, max-age=31536000, immutable',
  );
});
