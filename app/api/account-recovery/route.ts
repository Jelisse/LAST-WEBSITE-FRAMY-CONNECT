import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { tokenHash } from '@/lib/server-auth';
import { hash } from 'bcryptjs';
import { profileBody } from '@/lib/profile-api';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
async function limit(db: D1Database, key: string, maximum: number) {
  const now = Date.now();
  const row = await db
    .prepare(
      'INSERT INTO auth_attempts(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count',
    )
    .bind(await tokenHash('recovery:' + key), now + 900000, now, now)
    .first<{ count: number }>();
  return !!row && row.count <= maximum;
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem inválida.' }, 403);
  try {
    const b = await profileBody(request, 4096);
    if (!b || typeof b !== 'object')
      return json({ error: 'Pedido inválido.' }, 422);
    const db = database(),
      now = Date.now();
    if (b.action === 'send' || b.action === 'request') {
      const selfService = b.action === 'request';
      const acknowledge = () =>
        json(
          {
            ok: true,
            message:
              'Se existir uma conta activa com este email, receberá uma ligação de recuperação. Verifique também o spam.',
          },
          202,
        );
      const user = await getChatGPTUser();
      if (
        !selfService &&
        (!user || !['manager', 'director'].includes(user.role))
      )
        return json({ error: 'Acesso reservado à gestão.' }, 403);
      if (
        !selfService &&
        (typeof b.id !== 'string' ||
          !Number.isSafeInteger(b.version) ||
          b.confirmed !== true)
      )
        return json(
          { error: 'Confirme o pedido de recuperação do cliente.' },
          422,
        );
      // The destination is always taken from the account, never from the browser.
      if ((!selfService && b.email) || b.newEmail)
        return json(
          {
            error: 'A recuperação só pode ser enviada para o email registado.',
          },
          422,
        );
      if (
        !env.RESEND_API_KEY ||
        !env.PROFILE_EMAIL_FROM ||
        !env.PUBLIC_SITE_URL
      )
        return json(
          {
            error:
              'O envio de email ainda não está configurado. Contacte a administração.',
          },
          503,
        );
      const origin = new URL(env.PUBLIC_SITE_URL);
      if (
        origin.protocol !== 'https:' ||
        origin.username ||
        origin.password ||
        origin.pathname !== '/' ||
        origin.search ||
        origin.hash
      )
        return json(
          {
            error:
              'O endereço público de recuperação não está configurado correctamente.',
          },
          503,
        );
      const email =
        typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      if (
        selfService &&
        (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      )
        return json({ error: 'Indique um email válido.' }, 422);
      if (
        selfService &&
        (!(await limit(
          db,
          'request-ip:' + (request.headers.get('cf-connecting-ip') ?? 'local'),
          5,
        )) ||
          !(await limit(db, 'request-email:' + email, 3)))
      )
        return acknowledge();
      const row = await db
        .prepare(
          selfService
            ? 'SELECT id,email,version FROM auth_accounts WHERE email=? COLLATE NOCASE AND active=1'
            : "SELECT id,email,version FROM auth_accounts WHERE id=? AND role='customer' AND active=1",
        )
        .bind(selfService ? email : b.id)
        .first<{ id: string; email: string; version: number }>();
      if (!row && selfService) return acknowledge();
      if (!row)
        return json({ error: 'Seleccione uma conta de cliente activa.' }, 404);
      if (!selfService && row.version !== b.version)
        return json(
          { error: 'A conta mudou. Actualize a lista e tente novamente.' },
          409,
        );
      const actor = selfService ? row.id : user!.userId;
      if (
        !selfService &&
        (!(await limit(db, 'actor:' + actor, 20)) ||
          !(await limit(db, 'account:' + row.id, 3)))
      )
        return json(
          { error: 'Limite de recuperação atingido. Aguarde 15 minutos.' },
          429,
        );
      const token = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (v) => v.toString(16).padStart(2, '0'),
      ).join('');
      const key = await tokenHash(token);
      const expires = now + 30 * 60000;
      await db
        .prepare(
          'INSERT INTO auth_recovery(token_hash,account_id,account_version,email,created_by,expires_at,created_at) VALUES(?,?,?,?,?,?,?)',
        )
        .bind(key, row.id, row.version, row.email, actor, expires, now)
        .run();
      let accepted = false;
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json',
            'Idempotency-Key': 'customer-recovery-' + key,
          },
          body: JSON.stringify({
            from: env.PROFILE_EMAIL_FROM,
            to: [row.email],
            subject: 'Recuperar acesso à Framy Connect',
            text: `Recebemos um pedido de recuperação da sua conta.\n\nO seu email de acesso: ${row.email}\n\nDefina uma nova palavra-passe: ${origin.origin}/recuperar#${token}\n\nEsta ligação é pessoal, válida por 30 minutos e só pode ser usada uma vez. Nunca partilhe a ligação. A Framy não envia nem pede a sua palavra-passe. Se não solicitou esta recuperação, ignore a mensagem e contacte o suporte.`,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const body = (await response.json()) as { id?: string };
        accepted =
          response.ok && typeof body.id === 'string' && body.id.length > 0;
      } catch {
        accepted = false;
      }
      if (!accepted) {
        await db
          .prepare('DELETE FROM auth_recovery WHERE token_hash=?')
          .bind(key)
          .run();
        if (selfService) return acknowledge();
        return json(
          {
            error:
              'Não foi possível confirmar o envio. O acesso actual não foi alterado. Tente novamente mais tarde.',
          },
          502,
        );
      }
      const result = await db.batch([
        db
          .prepare(
            'UPDATE auth_recovery SET delivered=1 WHERE token_hash=? AND EXISTS(SELECT 1 FROM auth_accounts WHERE id=? AND active=1 AND email=? AND version=?)',
          )
          .bind(key, row.id, row.email, row.version),
        db
          .prepare(
            "INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,'Recuperação de cliente enviada ao email registado',?,? WHERE changes()=1",
          )
          .bind(
            crypto.randomUUID(),
            actor,
            row.id,
            new Date(now).toISOString(),
          ),
      ]);
      if (selfService) return acknowledge();
      if (!result[0].meta.changes)
        return json(
          {
            error:
              'A conta mudou durante o envio. A ligação não pode ser usada; actualize a lista.',
          },
          409,
        );
      return json({
        ok: true,
        message:
          'Email de recuperação aceite para envio. A ligação expira em 30 minutos.',
        expiresAt: expires,
      });
    }
    if (
      b.action !== 'reset' ||
      typeof b.token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(b.token) ||
      typeof b.password !== 'string' ||
      b.password.length < 12 ||
      new TextEncoder().encode(b.password).length > 72
    )
      return json(
        {
          error:
            'Use uma ligação válida e uma palavra-passe com pelo menos 12 caracteres (máximo 72 bytes).',
        },
        422,
      );
    if (
      !(await limit(
        db,
        'ip:' + (request.headers.get('cf-connecting-ip') ?? 'local'),
        30,
      ))
    )
      return json({ error: 'Demasiadas tentativas. Aguarde 15 minutos.' }, 429);
    const key = await tokenHash(b.token);
    const validSQL =
      "SELECT r.account_id FROM auth_recovery r JOIN auth_accounts a ON a.id=r.account_id AND a.active=1 AND a.email=r.email AND a.version=r.account_version JOIN auth_accounts issuer ON issuer.id=r.created_by AND issuer.active=1 AND (issuer.id=a.id OR (a.role='customer' AND issuer.role IN ('manager','director'))) WHERE r.token_hash=? AND r.delivered=1 AND r.expires_at>?";
    const recovery = await db
      .prepare(validSQL)
      .bind(key, now)
      .first<{ account_id: string }>();
    if (!recovery)
      return json(
        {
          error:
            'A ligação expirou, já foi usada ou deixou de ser válida. Solicite outra à gestão.',
        },
        410,
      );
    const password = await hash(b.password, 12),
      event = crypto.randomUUID();
    const result = await db.batch([
      db
        .prepare(
          `UPDATE auth_accounts SET password_hash=?,version=version+1 WHERE id=? AND id IN (${validSQL})`,
        )
        .bind(password, recovery.account_id, key, Date.now()),
      db
        .prepare(
          "INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,'Cliente concluiu recuperação; sessões terminadas',?,? WHERE changes()=1",
        )
        .bind(
          event,
          recovery.account_id,
          recovery.account_id,
          new Date().toISOString(),
        ),
      db
        .prepare(
          'DELETE FROM auth_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(recovery.account_id, event),
      db
        .prepare(
          'DELETE FROM auth_invitations WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(recovery.account_id, event),
      db
        .prepare(
          'DELETE FROM auth_recovery WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(recovery.account_id, event),
    ]);
    return result[0].meta.changes
      ? json({ ok: true })
      : json(
          { error: 'A ligação já foi utilizada ou deixou de ser válida.' },
          410,
        );
  } catch (error) {
    if (error instanceof Error && error.message === 'Pedido demasiado grande.')
      return json({ error: error.message }, 413);
    return json(
      { error: 'Não foi possível concluir a recuperação. Tente novamente.' },
      503,
    );
  }
}
