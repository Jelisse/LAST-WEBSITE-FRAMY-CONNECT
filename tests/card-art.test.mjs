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

test('custom colors survive order validation and appear on both print faces', () => {
  const colors = {from: '#112233', to: '#445566', accent: '#778899', text: '#ABCDEF'};
  const saved = validateDesign({optionId: 'blank-card', cardTheme: 'frame', cardColors: colors}, {id: 'pvc', category: 'Cartões'});
  assert.deepEqual(saved.cardColors, colors);
  for (const side of ['front', 'back']) {
    const svg = cardArtwork({theme: saved.cardTheme, colors: saved.cardColors, side});
    for (const color of Object.values(colors)) assert.ok(svg.includes(color));
    assert.match(svg, /width="85.5mm" height="54mm"/);
  }
  assert.throws(() => validateDesign({optionId: 'blank-card', cardColors: {...colors, accent: '"/><script>'}}, {id: 'pvc', category: 'Cartões'}));
});
test('new layouts produce different printable compositions', () => {
  const output = ['ocean', 'minimal', 'diagonal', 'frame'].map((theme) => {
    const saved = validateDesign({optionId: 'blank-card', cardTheme: theme}, {id: 'pvc', category: 'Cartões'});
    return cardArtwork({theme: saved.cardTheme, side: 'front'});
  });
  assert.equal(new Set(output).size, 4);
});
