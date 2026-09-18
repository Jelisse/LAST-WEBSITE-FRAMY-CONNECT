import assert from 'node:assert/strict';
const base = process.env.FRAMY_TEST_URL ?? 'http://localhost:3017';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw Error('This test creates synthetic accounts. Use an isolated local server only.');
const cases = [
  ['pt-MZ', 'O Seu Mundo,', 'Tornar-se agente', 'Bem-vindo à Framy'],
  ['en', 'Your World,', 'Become an agent', 'Welcome to Framy'],
  ['zh-Hant', '您的世界，', '成為代理員', '歡迎使用 Framy'],
];
for (const [locale, headline, agent, login] of cases) {
  for (const [path, expected] of [['/', headline], ['/aplicar', agent], ['/entrar', login]]) {
    const response = await fetch(base + path, { headers: { cookie: 'framy-language=' + locale } });
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes(`lang="${locale}"`), path + ': document language');
    assert.ok(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1].includes(expected), path + ': translated heading');
    if (path === '/') {
      const header = html.match(/<header[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? '';
      assert.ok(header.includes('href="/aplicar"') && header.includes(agent), 'agent application is in the header');
    }
  }
}
const invalid = await (await fetch(base, { headers: { cookie: 'framy-language=invalid-locale' } })).text();
assert.ok(invalid.includes('lang="pt-MZ"'));
const usernames = [];
for (let i = 0; i < 2; i++) {
  const response = await fetch(base + '/api/auth', {
    method: 'POST', headers: { origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', email: `language-${crypto.randomUUID()}@example.test`, password: 'Only-Local-QA-2026!', name: '陳小明' }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0] + '; framy-language=zh-Hant';
  const saved = await fetch(base + '/api/workspace', {
    method: 'POST', headers: { cookie, origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save-profile', autoUsername: true, version: 0,
      profile: { name:'陳小明', username:'', title:'設計師', email:'', phone:'', website:'', showEmail:false, showPhone:false, links:[], bio:'', photoUrl:'', photoPosition:35 } }),
  });
  assert.equal(saved.status, 200, await saved.text());
  const workspace = await (await fetch(base + '/api/workspace', { headers: { cookie } })).json();
  assert.equal(workspace.profile.name, '陳小明');
  assert.equal(workspace.profile.title, '設計師');
  assert.match(workspace.profile.username, /^[a-z0-9_]{3,40}$/);
  usernames.push(workspace.profile.username);
  const page = await (await fetch(base + '/perfil', { headers: { cookie } })).text();
  assert.ok(page.includes('lang="zh-Hant"'));
  assert.ok(page.includes('我的帳戶'));
  assert.ok(!page.includes('customer-profile-url'));
}
assert.notEqual(usernames[0], usernames[1], 'Chinese names receive separate reserved URLs');
console.log('PASS: Portuguese, English and Traditional Chinese SSR, header CTA, locale fallback, authenticated customer page and unique Chinese-name profile URLs.');
