import { hash, compare } from 'bcryptjs';
import { database } from '@/lib/server-db';
import { tokenHash, SESSION_COOKIE, type Account } from '@/lib/server-auth';
import { loginDestination } from '@/lib/auth-policy';
export const dynamic = 'force-dynamic';
const json = (
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 4096)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw);
    const db = database(),
      now = Date.now();
    if (b.action === 'logout') {
      const token = request.headers
        .get('cookie')
        ?.match(/(?:^|;\s*)framy_session=([a-f0-9]{64})(?:;|$)/)?.[1];
      if (token)
        await db
          .prepare('DELETE FROM auth_sessions WHERE token_hash=?')
          .bind(await tokenHash(token))
          .run();
      return json({ next: '/' }, 200, {
        'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${url.protocol === 'https:' ? '; Secure' : ''}`,
      });
    }
    const email =
      typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      typeof b.password !== 'string' ||
      b.password.length < 12 ||
      new TextEncoder().encode(b.password).length > 72
    )
      return json(
        {
          error:
            'Indique um email válido e uma palavra-passe com pelo menos 12 caracteres (máximo 72 bytes).',
        },
        422,
      );
    if (!['login', 'register'].includes(b.action))
      return json({ error: 'Pedido inválido.' }, 422);
    const keys = [
      await tokenHash('email:' + email),
      await tokenHash(
        'ip:' + (request.headers.get('cf-connecting-ip') ?? 'local'),
      ),
    ];
    for (const key of keys) {
      const row = await db
        .prepare(
          'INSERT INTO auth_attempts(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count',
        )
        .bind(key, now + 900000, now, now)
        .first<{ count: number }>();
      if ((row?.count ?? 99) > (key === keys[0] ? 10 : 50))
        return json(
          {
            error:
              'Demasiadas tentativas. Tente novamente dentro de 15 minutos.',
          },
          429,
        );
    }
    let account = await db
      .prepare('SELECT * FROM auth_accounts WHERE email=? AND active=1')
      .bind(email)
      .first<Account>();
    if (b.action === 'register') {
      if (account)
        return json(
          { error: 'Não foi possível criar esta conta. Tente iniciar sessão.' },
          409,
        );
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      if (name.length < 2 || name.length > 100)
        return json({ error: 'Indique o seu nome completo.' }, 422);
      account = {
        id: crypto.randomUUID(),
        email,
        name,
        role: 'customer',
        password_hash: await hash(b.password, 12),
      };
      await db
        .prepare(
          'INSERT INTO auth_accounts(id,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?)',
        )
        .bind(
          account.id,
          email,
          name,
          account.password_hash,
          'customer',
          new Date().toISOString(),
        )
        .run();
    } else {
      const valid = await compare(
        b.password,
        account?.password_hash ??
          '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYgZrH5YV2lZn5M3f0lVIV6cdh.IJG0K',
      );
      if (!account || !valid)
        return json({ error: 'Email ou palavra-passe incorrectos.' }, 401);
    }
    if (account.role === 'agent') {
      const agent = await db
        .prepare(
          "SELECT data_json FROM manager_records WHERE id=? AND kind='agent'",
        )
        .bind(account.id)
        .first<{ data_json: string }>();
      if (!agent || !JSON.parse(agent.data_json).active)
        return json(
          { error: 'Esta conta está desactivada. Contacte o Manager.' },
          403,
        );
    }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    await db
      .prepare(
        'INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)',
      )
      .bind(await tokenHash(token), account.id, now + 86400000)
      .run();
    return json(
      {
        next: loginDestination(
          account.role,
          typeof b.returnTo === 'string' ? b.returnTo : '',
        ),
      },
      200,
      {
        'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${url.protocol === 'https:' ? '; Secure' : ''}`,
      },
    );
  } catch {
    return json({ error: 'Não foi possível entrar. Tente novamente.' }, 503);
  }
}
