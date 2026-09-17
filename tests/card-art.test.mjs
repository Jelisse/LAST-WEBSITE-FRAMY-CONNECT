import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cardArtwork,
  cardThemes,
  cardIsPortrait,
  cardCopyFields,
} from '../lib/card-art.ts';
import { validateDesign, resetProductDesign } from '../lib/customisation.ts';
import { products } from '../lib/catalog.ts';
test('PVC price includes the printed personalised product', () => {
  const pvc = products.find((p) => p.id === 'pvc');
  assert.equal(pvc.amount, 95000);
  assert.equal(pvc.available, false);
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
  const colors = {
    from: '#112233',
    to: '#445566',
    accent: '#778899',
    text: '#ABCDEF',
  };
  const saved = validateDesign(
    { optionId: 'blank-card', cardTheme: 'frame', cardColors: colors },
    { id: 'pvc', category: 'Cartões' },
  );
  assert.deepEqual(saved.cardColors, colors);
  for (const side of ['front', 'back']) {
    const svg = cardArtwork({
      theme: saved.cardTheme,
      colors: saved.cardColors,
      side,
    });
    for (const color of Object.values(colors)) assert.ok(svg.includes(color));
    assert.match(svg, /width="85.5mm" height="54mm"/);
  }
  assert.throws(() =>
    validateDesign(
      {
        optionId: 'blank-card',
        cardColors: { ...colors, accent: '"/><script>' },
      },
      { id: 'pvc', category: 'Cartões' },
    ),
  );
});
test('new layouts produce different printable compositions', () => {
  const output = ['ocean', 'minimal', 'diagonal', 'frame'].map((theme) => {
    const saved = validateDesign(
      { optionId: 'blank-card', cardTheme: theme },
      { id: 'pvc', category: 'Cartões' },
    );
    return cardArtwork({ theme: saved.cardTheme, side: 'front' });
  });
  assert.equal(new Set(output).size, 4);
});

test('reference collection replaces old choices and prints portrait dimensions correctly', () => {
  assert.equal(cardThemes.length, 12);
  assert.ok(
    !cardThemes.some((t) =>
      [
        'forest',
        'violet',
        'framy',
        'ocean',
        'minimal',
        'diagonal',
        'frame',
      ].includes(t.id),
    ),
  );
  for (const theme of cardThemes) {
    const saved = validateDesign(
      { optionId: 'blank-card', cardTheme: theme.id },
      { id: 'pvc', category: 'Cartões' },
    );
    for (const side of ['front', 'back']) {
      const svg = cardArtwork({
        theme: saved.cardTheme,
        side,
        name: 'A <B>',
        email: 'test@example.com',
        qr: 'data:image/png;base64,QR',
      });
      assert.ok(
        svg.includes(
          cardIsPortrait(theme.id)
            ? 'width="54mm" height="85.5mm"'
            : 'width="85.5mm" height="54mm"',
        ),
      );
      if (side === 'back') {
        assert.ok(svg.includes('A &lt;B&gt;'));
        assert.ok(svg.includes('test@example.com'));
        assert.ok(svg.includes('data:image/png;base64,QR'));
      }
    }
  }
});

test('editable copy survives validation and replaces fixed branding without changing QR', () => {
  const cardText = {
    front: { brand: 'My <Logo>', name: 'Ana', email: 'ana@example.test' },
    back: {
      brand: '',
      name: 'Maria',
      email: 'maria@example.test',
      action: 'Contact me',
    },
  };
  const saved = validateDesign(
    {
      optionId: 'blank-card',
      cardTheme: 'navy-gold',
      cardText,
      editorVersion: 2,
    },
    { id: 'pvc', category: 'Cartões' },
  );
  assert.deepEqual(saved.cardText, cardText);
  const front = cardArtwork({
    theme: 'navy-gold',
    side: 'front',
    copy: saved.cardText.front,
  });
  assert.ok(front.includes('My &lt;Logo&gt;'));
  assert.ok(!front.includes('Ana'));
  const back = cardArtwork({
    theme: 'navy-gold',
    side: 'back',
    copy: saved.cardText.back,
    qr: 'data:image/png;base64,REALQR',
  });
  assert.ok(back.includes('Maria'));
  assert.ok(back.includes('Contact me'));
  assert.ok(back.includes('data:image/png;base64,REALQR'));
  for (const theme of cardThemes) {
    const svg = cardArtwork({ theme: theme.id, side: 'front' });
    assert.ok(svg.includes('Logo'));
    assert.ok(!svg.includes('FRAMY'));
  }
  assert.throws(() =>
    validateDesign(
      {
        optionId: 'blank-card',
        cardText: { front: { brand: 'X'.repeat(81) } },
      },
      { id: 'pvc', category: 'Cartões' },
    ),
  );
});

test('every logo upload occupies its template placeholder and retains contact text', () => {
  for (const theme of cardThemes) {
    const side = 'front';
    const placeholder = cardArtwork({ theme: theme.id, side });
    const uploaded = cardArtwork({
      theme: theme.id,
      side,
      name: 'Customer',
      email: 'customer@example.test',
      art: {
        src: 'data:image/png;base64,IMAGE',
        scale: 100,
        x: 0,
        y: 0,
        placement: 'logo',
      },
    });
    assert.equal(
      placeholder.match(/data-logo-slot="([^"]+)"/)[1],
      uploaded.match(/data-logo-slot="([^"]+)"/)[1],
    );
    assert.ok(uploaded.includes('data:image/png;base64,IMAGE'));
    assert.ok(!uploaded.includes('>Logo</text>'));
    assert.ok(uploaded.includes('clip-path="url(#logo-slot)"'));
    if (side === 'back') {
      assert.ok(uploaded.includes('Customer'));
      assert.ok(uploaded.includes('customer@example.test'));
    }
  }
});

test('card backs never render logo placeholders or uploaded logos, while retaining profile and QR', () => {
  for (const theme of [
    ...cardThemes.map((t) => t.id),
    'forest',
    'violet',
    'framy',
    'ocean',
    'minimal',
    'diagonal',
    'frame',
  ]) {
    for (const art of [
      undefined,
      {
        src: 'data:image/png;base64,LOGO',
        scale: 100,
        x: 0,
        y: 0,
        placement: 'logo',
      },
    ]) {
      const svg = cardArtwork({
        theme,
        side: 'back',
        name: 'Customer',
        email: 'customer@example.test',
        qr: 'data:image/png;base64,QR',
        art,
      });
      assert.ok(!svg.includes('data-logo-slot'));
      assert.ok(!svg.includes('>Logo</text>'));
      assert.ok(!svg.includes('data:image/png;base64,LOGO'));
      assert.ok(svg.includes('Customer'));
      assert.ok(svg.includes('customer@example.test'));
      assert.ok(svg.includes('data:image/png;base64,QR'));
      assert.ok(!cardCopyFields(theme, 'back').includes('brand'));
    }
  }
});

test('Repor removes edits from both sides and preserves the template and profile identity', () => {
  const base = {
    optionId: 'blank-card',
    cardTheme: 'blue-connect',
    editorVersion: 2,
    profileUrl: 'https://example.test/customer',
    holderName: 'Customer',
    holderEmail: 'customer@example.test',
  };
  const art = {
    fileKey: 'logo',
    assetId: 'saved-logo',
    name: 'logo.png',
    page: 1,
    scale: 120,
    x: 10,
    y: 20,
    placement: 'logo',
  };
  const edited = {
    ...base,
    front: art,
    back: art,
    cardText: { front: { brand: 'Edited' }, back: { name: 'Edited' } },
    cardColors: {
      from: '#112233',
      to: '#445566',
      accent: '#778899',
      text: '#ffffff',
    },
  };
  const reset = resetProductDesign(edited);
  assert.deepEqual(reset, base);
  assert.equal(edited.front, art);
  assert.deepEqual(resetProductDesign(reset), base);
  const saved = validateDesign(reset, { id: 'pvc', category: 'Cartões' });
  assert.equal(saved.front, undefined);
  assert.equal(saved.back, undefined);
  assert.equal(saved.cardText, undefined);
  assert.equal(saved.cardColors, undefined);
  assert.ok(
    cardArtwork({ theme: reset.cardTheme, side: 'front' }).includes(
      '>Logo</text>',
    ),
  );
});

test('all templates reserve branding for the front and contact information for the back', () => {
  for (const theme of [
    ...cardThemes.map((t) => t.id),
    'forest',
    'violet',
    'framy',
    'ocean',
    'minimal',
    'diagonal',
    'frame',
  ]) {
    const copy = {
      brand: 'Unique Brand',
      subtitle: 'Unique Subtitle',
      name: 'Unique Customer',
      email: 'unique@example.test',
      action: 'Unique Action',
    };
    const front = cardArtwork({
      theme,
      side: 'front',
      name: copy.name,
      email: copy.email,
      copy,
    });
    const back = cardArtwork({
      theme,
      side: 'back',
      name: copy.name,
      email: copy.email,
      copy,
      qr: 'data:image/png;base64,QR',
    });
    for (const value of [copy.brand, copy.subtitle]) {
      assert.ok(front.includes(value), `${theme}: missing front branding`);
      assert.ok(!back.includes(value), `${theme}: duplicated branding`);
    }
    for (const value of [copy.name, copy.email]) {
      assert.ok(
        !front.includes(value),
        `${theme}: duplicated contact information`,
      );
      assert.ok(
        back.includes(value),
        `${theme}: missing back contact information`,
      );
    }
    assert.ok(!front.includes(copy.action));
    assert.ok(!front.includes('data:image/png;base64,QR'));
    assert.ok(back.includes('data:image/png;base64,QR'));
    const frontFields = cardCopyFields(theme, 'front');
    assert.ok(
      cardCopyFields(theme, 'back').every(
        (field) => !frontFields.includes(field),
      ),
    );
  }
});
