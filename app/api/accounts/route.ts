import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { tokenHash } from '@/lib/server-auth';
import { canAdministerRole, mayChangeAccount } from '@/lib/staff-policy';
import type { AccountRole } from '@/lib/auth-policy';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
type Row = {
  id: string;
  name: string;
  email: string;
  role: AccountRole;
  active: number;
  version: number;
  profileUsername: string | null;
  profilePublished: number;
};
export async function GET(request?: Request) {
  const user = await getChatGPTUser();
  if (!user || !['manager', 'director'].includes(user.role))
    return json({ error: 'Acesso reservado à gestão.' }, 403);
  try {
    const db = database();
    const search = request
      ? (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 100)
      : '';
    const pattern = '%' + search.replace(/[\\%_]/g, '\\$&') + '%';
    const rows = await db
      .prepare(
        "SELECT a.id,a.name,a.email,a.role,a.active,a.version,p.username AS profileUsername,CASE WHEN p.published_json IS NOT NULL THEN 1 ELSE 0 END AS profilePublished FROM auth_accounts a LEFT JOIN profiles p ON p.owner_id=a.id WHERE (a.name LIKE ? ESCAPE '\\' OR a.email LIKE ? ESCAPE '\\') ORDER BY a.name LIMIT 500",
      )
      .bind(pattern, pattern)
      .all<Row>();
    const agents = await db
      .prepare(
        "SELECT id,json_extract(data_json,'$.name') AS name FROM manager_records WHERE kind='agent' AND NOT EXISTS(SELECT 1 FROM auth_accounts WHERE auth_accounts.id=manager_records.id)",
      )
      .all();
    return json({
      recoveryEmailReady: !!(
        env.RESEND_API_KEY &&
        env.PROFILE_EMAIL_FROM &&
        env.PUBLIC_SITE_URL
      ),
      accounts: rows.results.filter((r) =>
        canAdministerRole(user.role, r.role),
      ),
      agents: agents.results,
      selfId: user.userId,
      canCreateDirector: user.role === 'director',
    });
  } catch {
    return json({ error: 'Não foi possível carregar os acessos.' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !['manager', 'director'].includes(user.role))
    return json({ error: 'Acesso reservado à gestão.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem inválida.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 5000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw),
      db = database(),
      now = new Date().toISOString();
    if (!b || typeof b !== 'object')
      return json({ error: 'Pedido inválido.' }, 422);
    if (b.action === 'create') {
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      const email =
        typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      const role = b.role as AccountRole;
      if (
        !['agent', 'manager', 'director'].includes(role) ||
        !canAdministerRole(user.role, role)
      )
        return json({ error: 'Não pode atribuir este nível de acesso.' }, 403);
      if (
        name.length < 2 ||
        name.length > 100 ||
        email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(email)
      )
        return json({ error: 'Indique nome e email válidos.' }, 422);
      let id = crypto.randomUUID() as string;
      if (b.agentId) {
        if (role !== 'agent' || typeof b.agentId !== 'string')
          return json({ error: 'Seleccione um agente válido.' }, 422);
        const agent = await db
          .prepare("SELECT id FROM manager_records WHERE id=? AND kind='agent'")
          .bind(b.agentId)
          .first();
        if (!agent) return json({ error: 'Agente não encontrado.' }, 404);
        id = b.agentId;
      }
      const token = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (v) => v.toString(16).padStart(2, '0'),
      ).join('');
      const expires = Date.now() + 86400000;
      await db.batch([
        db
          .prepare(
            'INSERT INTO auth_accounts(id,email,name,password_hash,role,active,created_at,version) VALUES(?,?,?,?,?,0,?,1)',
          )
          .bind(id, email, name, '!invitation-only', role, now),
        ...(role === 'agent'
          ? [
              db
                .prepare(
                  "INSERT INTO manager_records(id,kind,data_json,version,updated_at) VALUES(?,'agent',?,1,?) ON CONFLICT(id) DO UPDATE SET data_json=json_set(manager_records.data_json,'$.name',?,'$.email',?,'$.active',json('true')),version=manager_records.version+1,updated_at=? WHERE manager_records.kind='agent'",
                )
                .bind(
                  id,
                  JSON.stringify({ id, name, email, phone: '', active: true }),
                  now,
                  name,
                  email,
                  now,
                ),
            ]
          : []),
        db
          .prepare(
            'INSERT INTO auth_invitations(token_hash,account_id,created_by,expires_at,created_at) VALUES(?,?,?,?,?)',
          )
          .bind(await tokenHash(token), id, user.userId, expires, now),
        db
          .prepare(
            'INSERT INTO manager_audit(id,actor,action,subject,created_at) VALUES(?,?,?,?,?)',
          )
          .bind(
            crypto.randomUUID(),
            user.userId,
            'Conta criada; activação pendente',
            id,
            now,
          ),
      ]);
      return json({
        ok: true,
        invitationUrl: new URL('/activar#' + token, request.url).href,
        expiresAt: new Date(expires).toISOString(),
      });
    }
    if (b.action === 'delete') {
      if (typeof b.id !== 'string' || !Number.isSafeInteger(b.version))
        return json({ error: 'Pedido inválido.' }, 422);
      const row = await db
        .prepare(
          'SELECT id,name,email,role,active,version FROM auth_accounts WHERE id=?',
        )
        .bind(b.id)
        .first<Row>();
      if (!row) return json({ error: 'Conta não encontrada.' }, 404);
      if (!mayChangeAccount({ id: user.userId, role: user.role }, row, row.role))
        return json(
          {
            error:
              'Não pode eliminar a sua conta ou este nível de acesso.',
          },
          403,
        );
      // Financial and operational history is never destroyed; deactivate instead.
      const kept = await db
        .prepare(
          `SELECT EXISTS(SELECT 1 FROM paysuite_product_orders WHERE owner_id=?)
          OR EXISTS(SELECT 1 FROM paysuite_payments WHERE owner_id=?)
          OR EXISTS(SELECT 1 FROM profile_invoices WHERE owner_id=? OR confirmed_by=?)
          OR EXISTS(SELECT 1 FROM payment_records WHERE verified_by=?)
          OR EXISTS(SELECT 1 FROM manager_audit WHERE actor=?)
          OR EXISTS(SELECT 1 FROM finance_entries WHERE actor=?)
          OR EXISTS(SELECT 1 FROM plan_revisions WHERE actor=?)
          OR EXISTS(SELECT 1 FROM finance_period_locks WHERE actor=?)
          OR EXISTS(SELECT 1 FROM finance_documents WHERE updated_by=?)
          OR EXISTS(SELECT 1 FROM manager_preferences WHERE updated_by=?)
          OR EXISTS(SELECT 1 FROM profile_receipts WHERE actor=?)
          OR EXISTS(SELECT 1 FROM auth_recovery WHERE created_by=?)
          OR EXISTS(SELECT 1 FROM auth_invitations WHERE created_by=?) AS kept`,
        )
        .bind(
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
          row.id,
        )
        .first<{ kept: number }>();
      if (kept?.kept)
        return json(
          {
            error:
              'A conta tem historial financeiro ou operacional. Desactive-a em vez de a eliminar.',
          },
          422,
        );
      // The audit marker gates every delete: a stale version makes them all
      // no-ops, so a conflict never leaves partial data behind.
      const eventId = crypto.randomUUID(),
        gate = ' AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)';
      const statements = [
        db
          .prepare(
            'INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM auth_accounts WHERE id=? AND version=?)',
          )
          .bind(
            eventId,
            user.userId,
            'Conta eliminada permanentemente',
            row.name + ' · ' + row.email,
            now,
            row.id,
            b.version,
          ),
        db
          .prepare(
            'DELETE FROM profile_team_invites WHERE team_id IN (SELECT id FROM profile_teams WHERE owner_id=?)' +
              gate,
          )
          .bind(row.id, eventId),
        db
          .prepare(
            'DELETE FROM profile_team_members WHERE (account_id=? OR team_id IN (SELECT id FROM profile_teams WHERE owner_id=?))' +
              gate,
          )
          .bind(row.id, row.id, eventId),
        db
          .prepare('DELETE FROM profile_teams WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM profile_domains WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM profile_engagement WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM profile_enquiries WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM profile_notices WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM profile_connections WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM agent_applications WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM stored_assets WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM sandbox_events WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM sandbox_orders WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM sandbox_memberships WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM profiles WHERE owner_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM auth_sessions WHERE account_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM auth_invitations WHERE account_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM auth_recovery WHERE account_id=?' + gate)
          .bind(row.id, eventId),
        db
          .prepare(
            "DELETE FROM manager_records WHERE id=? AND kind='agent'" + gate,
          )
          .bind(row.id, eventId),
        db
          .prepare('DELETE FROM auth_accounts WHERE id=?' + gate)
          .bind(row.id, eventId),
      ];
      const result = await db.batch(statements);
      if (!result[0].meta.changes)
        return json(
          { error: 'A conta mudou. Actualize antes de eliminar.' },
          409,
        );
      return json({ ok: true });
    }
    if (
      !['update', 'invite'].includes(b.action) ||
      typeof b.id !== 'string' ||
      !Number.isSafeInteger(b.version)
    )
      return json({ error: 'Pedido inválido.' }, 422);
    const row = await db
      .prepare(
        'SELECT id,name,email,role,active,version FROM auth_accounts WHERE id=?',
      )
      .bind(b.id)
      .first<Row>();
    if (!row) return json({ error: 'Conta não encontrada.' }, 404);
    if (b.action === 'invite' && row.role === 'customer')
      return json(
        {
          error:
            'Use o envio de recuperação por email para contas de clientes.',
        },
        422,
      );
    const nextRole = (b.action === 'update' ? b.role : row.role) as AccountRole;
    if (
      !Object.hasOwn(
        { customer: 1, agent: 1, manager: 1, director: 1 },
        nextRole,
      ) ||
      !mayChangeAccount({ id: user.userId, role: user.role }, row, nextRole)
    )
      return json(
        { error: 'Não pode alterar a sua conta ou este nível de acesso.' },
        403,
      );
    // Role changes for existing operational identities require explicit migration, not a silent reassignment.
    if (nextRole !== row.role)
      return json(
        { error: 'Crie uma conta separada para outro nível de gestão.' },
        422,
      );
    const active = b.action === 'invite' ? 0 : b.active;
    if (![0, 1].includes(active))
      return json({ error: 'Estado inválido.' }, 422);
    if (b.action === 'update' && active === 1) {
      const credentials = await db
        .prepare('SELECT password_hash FROM auth_accounts WHERE id=?')
        .bind(row.id)
        .first<{ password_hash: string }>();
      if (credentials?.password_hash === '!invitation-only')
        return json(
          { error: 'A conta deve primeiro concluir a activação.' },
          422,
        );
    }
    const eventId = crypto.randomUUID();
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
      v.toString(16).padStart(2, '0'),
    ).join('');
    const result = await db.batch([
      db
        .prepare(`UPDATE auth_accounts SET active=?,version=version+1 WHERE id=? AND version=?
        AND (role<>'manager' OR ?=1 OR (SELECT COUNT(*) FROM auth_accounts WHERE role='manager' AND active=1 AND id<>?)>0)`)
        .bind(active, row.id, b.version, active, row.id),
      db
        .prepare(
          'INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
        )
        .bind(
          eventId,
          user.userId,
          b.action === 'invite'
            ? 'Acesso suspenso; recuperação emitida'
            : active
              ? 'Conta activada'
              : 'Conta desactivada',
          row.id,
          now,
        ),
      db
        .prepare(
          'DELETE FROM auth_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(row.id, eventId),
      db
        .prepare(
          'DELETE FROM auth_invitations WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(row.id, eventId),
      ...(row.role === 'agent'
        ? [
            db
              .prepare(
                "UPDATE manager_records SET data_json=json_set(data_json,'$.active',json(?)),version=version+1,updated_at=? WHERE id=? AND kind='agent' AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)",
              )
              .bind(
                active === 1 || b.action === 'invite' ? 'true' : 'false',
                now,
                row.id,
                eventId,
              ),
          ]
        : []),
      ...(b.action === 'invite'
        ? [
            db
              .prepare(
                'INSERT INTO auth_invitations(token_hash,account_id,created_by,expires_at,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
              )
              .bind(
                await tokenHash(token),
                row.id,
                user.userId,
                Date.now() + 86400000,
                now,
                eventId,
              ),
          ]
        : []),
    ]);
    if (!result[0].meta.changes)
      return json(
        {
          error:
            'A conta mudou ou esta alteração deixaria o sistema sem gestor activo.',
        },
        409,
      );
    return json({
      ok: true,
      ...(b.action === 'invite'
        ? { invitationUrl: new URL('/activar#' + token, request.url).href }
        : {}),
    });
  } catch {
    return json(
      {
        error:
          'Não foi possível guardar. Verifique se o email ou agente já tem uma conta e actualize os dados.',
      },
      409,
    );
  }
}
