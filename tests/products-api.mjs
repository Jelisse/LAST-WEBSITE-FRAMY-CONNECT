import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = 'http://localhost:3000';
const auth = await fetch(base + '/signin-with-chatgpt?return_to=/operations', {
  redirect: 'manual',
});
const cookie = auth.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie, 'local development sign-in must succeed');
const headers = { cookie, origin: base, 'Content-Type': 'application/json' };
const read = async (path, init = {}) => {
  const r = await fetch(base + path, init);
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: text.slice(0, 200) };
  }
  return { status: r.status, body };
};
assert.equal((await read('/api/manage-products')).status, 401);
assert.equal(
  (
    await read('/api/manage-products', {
      headers: {
        'oai-authenticated-user-id': 'local_seedy',
        'oai-authenticated-user-email': 'forged@example.com',
      },
    })
  ).status,
  401,
);
const initial = await read('/api/manage-products', { headers: { cookie } });
assert.equal(initial.status, 200);
assert.equal(initial.body.products.length, 12);
const original = initial.body.products.find((p) => p.id === 'metal');
const put = (data, extra = {}) =>
  read('/api/manage-products', {
    method: 'PUT',
    headers: { ...headers, ...extra },
    body: JSON.stringify(data),
  });
assert.equal(
  (await put(original, { origin: 'https://untrusted.example' })).status,
  403,
);
assert.equal((await put({ ...original, amount: -1 })).status, 422);
assert.equal(
  (await put({ ...original, imageUrl: 'https://untrusted.example/image.png' }))
    .status,
  422,
);
let latest = original;
try {
  const edited = await put({
    ...original,
    name: original.name + ' QA',
    amount: original.amount + 100,
  });
  assert.equal(edited.status, 200);
  latest = edited.body.product;
  assert.equal(
    (await put(original)).status,
    409,
    'stale edit must be rejected',
  );
  const storefront = await read('/api/products');
  assert.equal(storefront.status, 200);
  const visible = storefront.body.products.find((p) => p.id === 'metal');
  assert.equal(visible.name, latest.name);
  assert.equal(visible.amount, latest.amount);
  assert.equal('cost' in visible, false);
  const homepage = await fetch(base + '/').then((r) => r.text());
  assert.ok(
    homepage.includes(latest.name),
    'homepage must use saved catalogue',
  );
  assert.ok(
    homepage.includes('/products/metal.png'),
    'homepage must use matching image',
  );
  const bad = await fetch(base + '/api/product-image', {
    method: 'POST',
    headers: { cookie, origin: base, 'Content-Type': 'image/svg+xml' },
    body: '<svg onload="alert(1)"/>',
  });
  assert.equal(bad.status, 422);
  const image = await readFile(
    new URL('../public/products/metal.png', import.meta.url),
  );
  const uploaded = await read('/api/product-image', {
    method: 'POST',
    headers: { cookie, origin: base, 'Content-Type': 'image/png' },
    body: image,
  });
  assert.equal(uploaded.status, 200);
  const asset = await fetch(base + uploaded.body.imageUrl);
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get('content-type'), 'image/png');
  const imageEdit = await put({ ...latest, imageUrl: uploaded.body.imageUrl });
  assert.equal(imageEdit.status, 200);
  latest = imageEdit.body.product;
} finally {
  const restored = await put({ ...original, version: latest.version });
  assert.equal(restored.status, 200, 'restore original product after checks');
}
console.log(
  'Product API checks passed: auth, CSRF, validation, persistence, conflict, public pricing, image upload and restore.',
);
