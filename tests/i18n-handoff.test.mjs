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
    assert.equal(values.length, 2, key);
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
    assert.ok(picker.includes('繁體中文'));
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
