import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  blankProfile,
  usernameFromName,
  validateProfile,
} from '../lib/domain.ts';
const require = createRequire(import.meta.url);
const read = (file) =>
  readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const messages = JSON.parse(read('lib/translations.json'));
const moduleURL = (code) =>
  'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const dependencies = {};
async function module(file, overrides = {}) {
  const src = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const url = moduleURL(
    src.replace(/from ['"]([^'"]+)['"]/g, (_, name) => {
      const target =
        overrides[name] ||
        dependencies[name] ||
        pathToFileURL(require.resolve(name)).href;
      return `from '${target}'`;
    }),
  );
  return { url, exports: await import(url) };
}
const i18n = await module('lib/i18n.ts', {
  './translations.json': moduleURL(
    'export default ' + JSON.stringify(messages),
  ),
});
dependencies['@/lib/i18n'] = i18n.url;
const language = await module('components/language-provider.tsx');
dependencies['@/components/language-provider'] = language.url;
dependencies['@/components/ui/button'] = moduleURL(
  `import React from '${pathToFileURL(require.resolve('react')).href}'; export function Button({variant,...props}){ return React.createElement('button',props); }`,
);
const { ProfileHandoff } = (await module('components/profile-handoff.tsx'))
  .exports;
const { translator, validLocale } = i18n.exports;
const { LanguageProvider, LanguageSelector } = language.exports;
const { localizedResponse } = (
  await module('lib/localized-response.ts', {
    './i18n': i18n.url,
  })
).exports;
const { PasswordInput } = (
  await module('components/password-input.tsx', {
    './language-provider': language.url,
  })
).exports;

test('password visibility is an accessible non-submit control and starts hidden in each locale', () => {
  for (const locale of ['pt-MZ', 'en', 'zh-Hant']) {
    const html = renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        { locale },
        React.createElement(PasswordInput, {
          id: 'password',
          name: 'password',
          autoComplete: 'current-password',
        }),
      ),
    );
    assert.match(html, /type="password"/);
    assert.match(html, /type="button"/);
    assert.match(html, /aria-controls="password"/);
    assert.match(html, /aria-pressed="false"/);
    assert.ok(html.includes(translator(locale)('Mostrar palavra-passe')));
  }
});

test('public profile requests can translate errors into the selected language without changing the account cookie', async () => {
  const request = new Request('https://example.com/api/profile-enquiries', {
    headers: { cookie: 'framy-language=en', 'X-Framy-Language': 'zh-Hant' },
  });
  const response = await localizedResponse(
    request,
    Response.json({ error: 'Não foi possível enviar.' }, { status: 422 }),
  );
  assert.equal(
    (await response.json()).error,
    translator('zh-Hant')('Não foi possível enviar.'),
  );
  assert.equal(response.headers.get('set-cookie'), null);
});

test('API errors follow the selected locale without changing protocol or customer data', async () => {
  for (const locale of ['en', 'zh-Hant']) {
    const request = new Request('https://example.com/api/example', {
      headers: { cookie: `framy-language=${locale}` },
    });
    const response = await localizedResponse(
      request,
      Response.json(
        { error: 'Não foi possível enviar.', status: 'pending', name: 'Ana' },
        { status: 400, headers: { 'Set-Cookie': 'example=1; HttpOnly' } },
      ),
    );
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('Content-Language'), locale);
    assert.equal(response.headers.get('Set-Cookie'), 'example=1; HttpOnly');
    assert.deepEqual(await response.json(), {
      error: translator(locale)('Não foi possível enviar.'),
      status: 'pending',
      name: 'Ana',
    });
    const successful = Response.json({ biography: 'Não foi possível enviar.' });
    assert.equal(await localizedResponse(request, successful), successful);
    const plain = new Response('Unavailable', { status: 503 });
    assert.equal(await localizedResponse(request, plain), plain);
  }
});
test('locale validation, system notices and parameter interpolation preserve data', () => {
  assert.equal(validLocale('zh-Hant'), 'zh-Hant');
  assert.equal(validLocale('<script>'), 'pt-MZ');
  const en = translator('en'),
    zh = translator('zh-Hant');
  assert.equal(en('Minha Conta'), 'My Account');
  assert.equal(zh('Criar conta'), '建立帳戶');
  assert.equal(zh('Olá, {0}.', ['陳小明']), '您好，陳小明。');
  assert.equal(en('custom customer biography'), 'custom customer biography');
  assert.equal(en(' '), ' ');
  assert.equal(en('constructor'), 'constructor');
  assert.equal(en('__proto__'), '__proto__');
  assert.equal(
    zh('https://example.com/customer'),
    'https://example.com/customer',
  );
  assert.equal(
    en('Preencha correctamente o campo telefone.'),
    'Complete the phone field correctly.',
  );
  assert.equal(
    en(
      'O plano Criador permite 8 links. Remova links ou escolha um plano superior.',
    ),
    'The Creator plan allows 8 links. Remove links or choose a higher plan.',
  );
  const reference = '12345678-1234-1234-1234-123456789abc';
  assert.equal(
    en(
      'Não foi possível carregar os dados. Tente novamente. Referência: ' +
        reference,
    ),
    'Unable to load data. Please try again. Reference: ' + reference,
  );
});
test('all translated messages have English and Traditional Chinese with matching placeholders', () => {
  const params = (s) => [...s.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
  for (const [key, values] of Object.entries(messages)) {
    assert.ok(values.length === 2 || values.length === 6, key);
    for (const value of values) {
      assert.ok(typeof value === 'string' && value.trim(), key);
      assert.deepEqual(params(value), params(key), key);
    }
  }
});
test('every explicit UI translation key has both translations', () => {
  const files = (dir) =>
    readdirSync(new URL('../' + dir, import.meta.url), {
      withFileTypes: true,
    }).flatMap((e) =>
      e.isDirectory()
        ? files(dir + '/' + e.name)
        : e.name.endsWith('.tsx')
          ? [dir + '/' + e.name]
          : [],
    );
  for (const file of [...files('app'), ...files('components')]) {
    const ast = ts.createSourceFile(
      file,
      read(file),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(ast) === 't' &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const key = node.arguments[0].text.trim();
        assert.ok(messages[key], `${file}: ${key}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
});
test('customers get preview only; staff can copy the approved order URL in all languages', () => {
  const approvedUrl = 'https://framy.example/approved-order-profile';
  for (const locale of ['pt-MZ', 'en', 'zh-Hant']) {
    const render = (operations) =>
      renderToStaticMarkup(
        React.createElement(
          LanguageProvider,
          { locale },
          React.createElement(ProfileHandoff, {
            operations,
            approvedUrl,
            username: 'different-profile',
            published: true,
          }),
        ),
      );
    const customer = render(false),
      staff = render(true),
      t = translator(locale);
    assert.ok(customer.includes(t('Pré-visualizar perfil')));
    assert.ok(!customer.includes('<input'));
    assert.ok(!customer.includes(t('Copiar link')));
    assert.ok(staff.includes(t('Copiar link')));
    assert.ok(staff.includes(`value="${approvedUrl}"`));
    assert.ok(!staff.includes('/different-profile'));
    const picker = renderToStaticMarkup(
      React.createElement(
        LanguageProvider,
        { locale },
        React.createElement(LanguageSelector),
      ),
    );
    assert.match(
      picker,
      new RegExp(`<option[^>]*value="${locale}"[^>]*selected=""`),
    );
    assert.ok(picker.includes('中文（繁體）'));
  }
  assert.doesNotMatch(read('components/mobile-profile.tsx'), /clipboard/);
  assert.doesNotMatch(read('components/profile-share.tsx'), /clipboard/);
});
test('Chinese names generate valid profile URLs without changing the name', () => {
  const name = '陳小明';
  const profile = validateProfile({
    ...blankProfile,
    name,
    username: usernameFromName(name),
  });
  assert.equal(profile.name, name);
  assert.match(profile.username, /^[a-z0-9_]{3,40}$/);
  assert.equal(usernameFromName(''), '');
});

test('profile Ukrainian and Polish strings translate and missing application keys fall back to English', () => {
  assert.equal(validLocale('uk'), 'uk');
  assert.equal(validLocale('pl'), 'pl');
  assert.equal(translator('uk')('Sobre mim'), 'Про мене');
  assert.equal(translator('pl')('Adicionar contacto'), 'Dodaj kontakt');
  for (const [key, values] of Object.entries(messages)) {
    if (values.length === 6) {
      assert.equal(translator('uk')(key), values[2]);
      assert.equal(translator('pl')(key), values[3]);
    }
  }
});

test('French and Simplified Chinese cover every extended profile message with English fallback elsewhere', () => {
  assert.equal(validLocale('fr'), 'fr');
  assert.equal(validLocale('zh-Hans'), 'zh-Hans');
  assert.equal(translator('fr')('Sobre mim'), 'À propos de moi');
  assert.equal(translator('zh-Hans')('Adicionar contacto'), '添加联系人');
  assert.equal(translator('zh-Hant')('Adicionar contacto'), '新增聯絡人');
  for (const [key, values] of Object.entries(messages)) {
    if (values.length === 6) {
      assert.equal(translator('fr')(key), values[4]);
      assert.equal(translator('zh-Hans')(key), values[5]);
    } else {
      assert.equal(translator('fr')(key), values[0]);
      assert.equal(translator('zh-Hans')(key), values[0]);
    }
  }
});


test('profile invitation appears only after verified product payment and resumes existing drafts', async () => {
  const { PaidProfileNext } = (await module('components/paid-profile-next.tsx', {
    './language-provider': language.url,
    '@/components/hard-link': moduleURL(`import React from '${pathToFileURL(require.resolve('react')).href}'; export default function Link(props){return React.createElement('a',props);}`),
  })).exports;
  const render = (payment) => renderToStaticMarkup(React.createElement(LanguageProvider,{locale:'en'},React.createElement(PaidProfileNext,{payment})));
  const base={id:'payment-123',kind:'product',status:'paid',profileReady:false,profileExists:false};
  for(const status of ['pending','creating','failed','review','refunded']) assert.equal(render({...base,status}),'');
  assert.equal(render({...base,kind:'subscription'}),'');
  const fresh=render(base);
  assert.ok(fresh.includes(translator('en')('Continuar: criar e configurar perfil')));
  assert.ok(fresh.includes('payment-123'));
  assert.ok(fresh.includes(translator('en')('O perfil Personal é gratuito. Os planos pagos são opcionais e não estão incluídos nesta compra.')));
  for(const existing of [{profileExists:true},{profileReady:true}]) {
    const html=render({...base,...existing});
    assert.ok(html.includes(translator('en')('Continuar a configurar o perfil')));
    assert.ok(!html.includes(translator('en')('Continuar: criar e configurar perfil')));
  }
});
