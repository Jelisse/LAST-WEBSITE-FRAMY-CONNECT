import { hash } from 'bcryptjs';
import { database } from '@/lib/server-db';
import { tokenHash } from '@/lib/server-auth';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem inválida.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 3000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw);
    if (
      typeof b.token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(b.token) ||
      typeof b.password !== 'string' ||
      b.password.length < 12 ||
      new TextEncoder().encode(b.password).length > 72
    )
      return json(
        {
          error:
            'Use o convite recebido e uma palavra-passe com pelo menos 12 caracteres (máximo 72 bytes).',
        },
        422,
      );
    const db = database(),
      key = await tokenHash(b.token),
      now = Date.now();
    const invite = await db
      .prepare(
        `SELECT i.account_id FROM auth_invitations i JOIN auth_accounts issuer ON issuer.id=i.created_by AND issuer.active=1 AND issuer.role IN ('manager','director') WHERE i.token_hash=? AND i.used_at IS NULL AND i.expires_at>?`,
      )
      .bind(key, now)
      .first<{ account_id: string }>();
    if (!invite)
      return json(
        {
          error:
            'O convite é inválido, expirou ou já foi utilizado. Solicite outro à gestão.',
        },
        410,
      );
    const password = await hash(b.password, 12),
      eventId = crypto.randomUUID(),
      stamp = new Date().toISOString();
    const result = await db.batch([
      db
        .prepare(
          `UPDATE auth_invitations SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM auth_accounts WHERE id=auth_invitations.created_by AND active=1 AND role IN ('manager','director'))`,
        )
        .bind(now, key, now),
      db
        .prepare(
          'INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
        )
        .bind(
          eventId,
          invite.account_id,
          'Convite utilizado',
          invite.account_id,
          stamp,
        ),
      db
        .prepare(
          'UPDATE auth_accounts SET password_hash=?,active=1,version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(password, invite.account_id, eventId),
      db
        .prepare(
          'DELETE FROM auth_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(invite.account_id, eventId),
    ]);
    return result[0].meta.changes
      ? json({ ok: true })
      : json({ error: 'O convite já foi utilizado.' }, 410);
  } catch {
    return json({ error: 'Não foi possível activar a conta.' }, 503);
  }
}
