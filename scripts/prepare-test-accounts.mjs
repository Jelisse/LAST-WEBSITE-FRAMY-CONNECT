import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { hash } from 'bcryptjs';
mkdirSync('outputs', { recursive: true });
const path = 'outputs/test-accounts.json';
const accounts = existsSync(path)
  ? JSON.parse(readFileSync(path, 'utf8'))
  : [
      ['customer', 'cliente.teste@framy.example', 'Cliente Teste'],
      ['manager', 'manager.teste@framy.example', 'Manager Teste'],
      ['agent', 'agente.teste@framy.example', 'Agente Teste'],
      ['director', 'direccao.teste@framy.example', 'Direcção Teste'],
    ].map(([role, email, name]) => ({
      id: 'framy-test-' + role,
      role,
      email,
      name,
      password: randomBytes(18).toString('base64url'),
    }));
writeFileSync(path, JSON.stringify(accounts, null, 2));
const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const now = new Date().toISOString();
let sql = readFileSync('drizzle/0006_account_access.sql', 'utf8') + '\n';
for (const a of accounts) {
  sql += `INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(${[a.id, a.email, a.name, await hash(a.password, 12), a.role, now].map(q).join(',')}) ON CONFLICT DO NOTHING;\n`;
  if (a.role === 'agent')
    sql += `INSERT INTO manager_records(id,kind,data_json,version,updated_at) VALUES(${q(a.id)},'agent',${q(JSON.stringify({ name: a.name, email: a.email, phone: '', active: true }))},1,${q(now)}) ON CONFLICT DO NOTHING;\n`;
}
writeFileSync('outputs/test-accounts.sql', sql);
writeFileSync(
  'outputs/ACESSOS-DE-TESTE.md',
  '# Acessos de teste Framy\n\nEntrar em /entrar depois de aplicar outputs/test-accounts.sql à base de staging.\n\n' +
    accounts.map((a) => `- ${a.role}: ${a.email} — ${a.password}`).join('\n') +
    '\n\nEstas credenciais não são incluídas no Git. Os emails .example são identificadores de teste, não caixas de correio.\n',
);
console.log(
  'Credenciais privadas: outputs/ACESSOS-DE-TESTE.md. SQL de provisionamento: outputs/test-accounts.sql. Nenhuma conta foi publicada por este comando.',
);
