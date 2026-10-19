import { hash } from 'bcryptjs';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { corporateAccess } from '@/lib/server-corporate';
import { corporateText } from '@/lib/corporate';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
import { INDIVIDUAL_PLAN } from '@/lib/plan-policy';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const b = await profileBody(request, 3000);
    if (
      !(await rateLimit(
        request,
        'corporate-credentials:' + user.userId,
        20,
        600000,
      ))
    )
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    if (
      !['provision', 'reset'].includes(String(b.action)) ||
      !Number.isSafeInteger(b.version)
    )
      throw Error('Pedido inválido.');
    if (
      typeof b.password !== 'string' ||
      b.password.length < 12 ||
      new TextEncoder().encode(b.password).length > 72
    )
      throw Error(
        'Defina uma palavra-passe com pelo menos 12 caracteres (máximo 72 bytes).',
      );
    const org = await corporateAccess(
        user.userId,
        corporateText(b.organisation, 80),
        true,
      ),
      db = database(),
      id = corporateText(b.accountId, 80),
      name = corporateText(b.name, 100),
      now = Date.now(),
      event = crypto.randomUUID();
    // Delegated leaders may administer ordinary members, never another leader or the owner.
    const condition = `EXISTS(SELECT 1 FROM corporate_employee_access g JOIN corporate_members m ON m.organisation_id=g.organisation_id AND m.account_id=g.account_id
    JOIN corporate_active_organisations o ON o.id=g.organisation_id JOIN corporate_effective_members issuer ON issuer.organisation_id=o.id AND issuer.account_id=? AND issuer.role='leader'
    WHERE g.organisation_id=? AND g.account_id=auth_accounts.id AND g.revoked_at IS NULL AND m.active=1 AND m.left_at IS NULL AND auth_accounts.id<>o.owner_id
    AND (m.role='member' OR issuer.account_id=o.owner_id) AND (SELECT COUNT(*) FROM corporate_members e WHERE e.organisation_id=o.id AND e.active=1 AND e.account_id<>o.owner_id AND (e.accepted_at<m.accepted_at OR (e.accepted_at=m.accepted_at AND e.account_id<=m.account_id)))<=o.seats
    AND ${b.action === 'provision' ? "g.provisioned_at IS NULL AND auth_accounts.password_hash='!corporate-pending' AND auth_accounts.active=0" : 'g.provisioned_at IS NOT NULL AND auth_accounts.active=1'})`;
    // Check authorization before expensive hashing; SQL repeats it atomically after hashing.
    const eligible = await db
      .prepare(
        `SELECT id FROM auth_accounts WHERE id=? AND version=? AND role='customer' AND ${condition}`,
      )
      .bind(id, b.version, user.userId, org.id)
      .first();
    if (!eligible)
      return json(
        {
          error:
            'Sem autorização para gerir esta palavra-passe. Actualize a equipa.',
        },
        403,
      );
    const password = await hash(b.password, 12);
    const results = await db.batch([
      db
        .prepare(
          `UPDATE auth_accounts SET name=?,password_hash=?,active=1,version=version+1 WHERE id=? AND version=? AND role='customer' AND ${condition}`,
        )
        .bind(name, password, id, b.version, user.userId, org.id),
      db
        .prepare(
          'INSERT INTO corporate_audit SELECT ?,?,?,?,?,? WHERE changes()=1',
        )
        .bind(event, org.id, user.userId, String(b.action), id, now),
      db
        .prepare(
          'UPDATE corporate_employee_access SET provisioned_at=COALESCE(provisioned_at,?) WHERE organisation_id=? AND account_id=? AND EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)',
        )
        .bind(now, org.id, id, event),
      db
        .prepare(
          'INSERT OR IGNORE INTO sandbox_memberships(owner_id,plan_id,terms_json,updated_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)',
        )
        .bind(
          id,
          'personal',
          JSON.stringify(INDIVIDUAL_PLAN),
          new Date(now).toISOString(),
          event,
        ),
      db
        .prepare(
          'DELETE FROM auth_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)',
        )
        .bind(id, event),
      db
        .prepare(
          'DELETE FROM auth_recovery WHERE account_id=? AND EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)',
        )
        .bind(id, event),
    ]);
    return results[0].meta.changes
      ? json({ ok: true })
      : json({ error: 'Os dados mudaram. Actualize.' }, 409);
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    return json(
      {
        error:
          /^(Defina|Dados inválidos|Pedido inválido|Sem permissão|É necess|Origem|Pedido demasiado)/.test(
            message,
          )
            ? message
            : 'Não foi possível criar ou redefinir o acesso.',
      },
      422,
    );
  }
}
