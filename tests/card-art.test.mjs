import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardArtwork } from '../lib/card-art.ts';
import { validateDesign } from '../lib/customisation.ts';
import { products } from '../lib/catalog.ts';
test('PVC price includes the printed personalised product', () => {
  const pvc = products.find((p) => p.id === 'pvc');
  assert.equal(pvc.amount, 95000);
  assert.equal(pvc.available, true);
  assert.match(pvc.description, /impressão/);
});
test('card theme persists and unsupported styles fail validation', () => {
  assert.equal(
    validateDesign(
      { optionId: 'blank-card', cardTheme: 'violet' },
      { id: 'pvc', category: 'Cartões' },
    ).cardTheme,
    'violet',
  );
  assert.throws(() =>
    validateDesign(
      { optionId: 'blank-card', cardTheme: 'unknown' },
      { id: 'pvc', category: 'Cartões' },
    ),
  );
});
test('print document retains physical size and escapes customer information', () => {
  const svg = cardArtwork({
    theme: 'forest',
    side: 'back',
    name: 'A <B> & C',
    email: 'name@example.test',
    qr: 'data:image/png;base64,TEST',
  });
  assert.match(svg, /width="85.5mm" height="54mm"/);
  assert.match(svg, /A &lt;B&gt; &amp; C/);
  assert.ok(svg.includes('name@example.test'));
  assert.ok(svg.includes('data:image/png;base64,TEST'));
});
