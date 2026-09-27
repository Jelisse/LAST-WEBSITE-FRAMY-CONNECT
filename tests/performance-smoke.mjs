// Run against the isolated local production build, never the live shop.
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:8791';
async function check(path, expected) {
  const started = performance.now();
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(30_000) });
  const body = await response.text();
  assert.equal(response.status, 200, path);
  assert.match(body, expected, path);
  return Math.round(performance.now() - started);
}
for (const path of ['/', '/produtos', '/produtos/keychain', '/encomendar/keychain']) {
  console.log(path, await check(path, /Framy/), 'ms');
}
const options = await fetch(origin + '/api/product-options').then(r => r.json());
assert.equal(options.options.find(o => o.id === 'tiktok').quantity, 175);
const times = await Promise.all(Array.from({ length: 20 }, () => check('/encomendar/keychain', /Framy/)));
const after = await fetch(origin + '/api/product-options').then(r => r.json());
assert.deepEqual(after, options, 'Opening checkout must not reserve stock');
const asset = await fetch(origin + '/home/solange-card-front.webp');
assert.equal(asset.status, 200);
assert.match(asset.headers.get('content-type'), /image\/webp/);
console.log(`20 concurrent local purchase-page requests passed; slowest ${Math.max(...times)} ms. Stock unchanged.`);
