import { compare, hash } from 'bcryptjs';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { tokenHash } from '@/lib/server-auth';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem inválida.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 3000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw),
      db = database();
    if (!['password', 'logout-all'].includes(b.action))
      return json({ error: 'Acção inválida.' }, 422);
    if (b.action === 'password') {
      const now = Date.now();
      const attempt = await db
        .prepare(
          'INSERT INTO auth_attempts(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count',
        )
        .bind(
          await tokenHash('password:' + user.userId),
          now + 900000,
          now,
          now,
        )
        .first<{ count: number }>();
      if ((attempt?.count ?? 99) > 5)
        return json(
          { error: 'Demasiadas tentativas. Aguarde 15 minutos.' },
          429,
        );
      if (
        typeof b.currentPassword !== 'string' ||
        typeof b.password !== 'string' ||
        b.password.length < 12 ||
        new TextEncoder().encode(b.password).length > 72 ||
        new TextEncoder().encode(b.currentPassword).length > 72
      )
        return json(
          {
            error:
              'Use uma palavra-passe com pelo menos 12 caracteres (máximo 72 bytes).',
          },
          422,
        );
      const row = await db
        .prepare(
          'SELECT password_hash,version FROM auth_accounts WHERE id=? AND active=1',
        )
        .bind(user.userId)
        .first<{ password_hash: string; version: number }>();
      if (!row || !(await compare(b.currentPassword, row.password_hash)))
        return json({ error: 'Palavra-passe actual incorrecta.' }, 403);
      const eventId = crypto.randomUUID();
      const result = await db.batch([
        db
          .prepare(
            'UPDATE auth_accounts SET password_hash=?,version=version+1 WHERE id=? AND version=? AND active=1',
          )
          .bind(await hash(b.password, 12), user.userId, row.version),
        db
          .prepare(
            'INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
          )
          .bind(
            eventId,
            user.userId,
            'Palavra-passe alterada',
            user.userId,
            new Date().toISOString(),
          ),
        db
          .prepare(
            'DELETE FROM auth_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
          )
          .bind(user.userId, eventId),
        db
          .prepare(
            'DELETE FROM auth_invitations WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
          )
          .bind(user.userId, eventId),
      ]);
      if (!result[0].meta.changes)
        return json({ error: 'A conta mudou. Inicie sessão novamente.' }, 409);
    } else
      await db.batch([
        db
          .prepare('DELETE FROM auth_sessions WHERE account_id=?')
          .bind(user.userId),
        db
          .prepare(
            'INSERT INTO manager_audit(id,actor,action,subject,created_at) VALUES(?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            user.userId,
            'Todas as sessões terminadas',
            user.userId,
            new Date().toISOString(),
          ),
      ]);
    return json({ ok: true });
  } catch {
    return json(
      { error: 'Não foi possível actualizar a segurança da conta.' },
      503,
    );
  }
}
