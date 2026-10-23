import { companyQuote } from './launch-offers';
import { database } from './server-db';
import { mayChangeAccount } from './staff-policy';
import type { AccountRole } from './auth-policy';
export async function approveCorporate(
  user: { userId: string; role: AccountRole },
  b: Record<string, unknown>,
) {
  const db = database();
  const target = await db
    .prepare('SELECT id,role,active FROM auth_accounts WHERE id=?')
    .bind(typeof b.id === 'string' ? b.id : '')
    .first<{ id: string; role: AccountRole; active: number }>();
  if (
    !target ||
    !target.active ||
    !mayChangeAccount({ id: user.userId, role: user.role }, target, target.role)
  )
    throw Error('Sem permissão para aprovar esta conta.');
  if (!Number.isSafeInteger(b.version)) throw Error('Pedido inválido.');
  const active = b.action === 'corporate-approve';
  if (
    active &&
    (!Number.isInteger(b.seats) || Number(b.seats) < 1 || Number(b.seats) > 500)
  )
    throw Error('Indique entre 1 e 500 trabalhadores.');
  if (active) {
    const request = await db
      .prepare('SELECT details_json FROM corporate_requests WHERE owner_id=?')
      .bind(target.id)
      .first<{ details_json: string }>();
    const details = request ? JSON.parse(request.details_json) : null;
    if (details?.offer)
      companyQuote(details.offer, b.seats, details.cycle ?? 'monthly');
  }
  const now = Date.now(),
    event = crypto.randomUUID(),
    org = crypto.randomUUID();
  const result = await db.batch([
    db
      .prepare(
        `UPDATE corporate_requests SET status=?,seats=COALESCE(?,seats),approved_at=?,approved_by=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM auth_accounts actor WHERE actor.id=? AND actor.active=1 AND actor.role=?) AND status IN ${active ? "('submitted','suspended')" : "('approved')"}`,
      )
      .bind(
        active ? 'approved' : 'suspended',
        active ? Number(b.seats) : null,
        now,
        user.userId,
        now,
        target.id,
        b.version,
        user.userId,
        user.role,
      ),
    db
      .prepare(
        'INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
      )
      .bind(
        event,
        user.userId,
        active
          ? 'Corporate access approved (not payment)'
          : 'Corporate access suspended',
        target.id,
        new Date(now).toISOString(),
      ),
    db
      .prepare(
        'INSERT OR IGNORE INTO corporate_organisations(id,owner_id,name,created_at) SELECT ?,owner_id,company,? FROM corporate_requests WHERE owner_id=? AND status=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
      )
      .bind(org, now, target.id, 'approved', event),
    db
      .prepare(
        "INSERT OR IGNORE INTO corporate_members(organisation_id,account_id,role,accepted_at) SELECT id,owner_id,'leader',? FROM corporate_organisations WHERE owner_id=? AND EXISTS(SELECT 1 FROM corporate_active_organisations o WHERE o.id=corporate_organisations.id) AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)",
      )
      .bind(now, target.id, event),
  ]);
  return !!result[0].meta.changes;
}
