import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { getManagedPlans } from '@/lib/server-plans';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import {
  reminderDefaults,
  validateReminderSettings,
} from '@/lib/subscription-settings';
import { profileAccess } from '@/lib/entitlement';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado.' }, 403);
  try {
    const db = database();
    const [plans, settings, members, audit, deliveries] = await Promise.all([
      getManagedPlans(),
      db
        .prepare(
          "SELECT data_json,version FROM manager_preferences WHERE id='renewal-messages'",
        )
        .first<{ data_json: string; version: number }>(),
      db
        .prepare(
          'SELECT m.*,a.name,a.email FROM profile_membership_view m JOIN auth_accounts a ON a.id=m.owner_id WHERE a.active=1 ORDER BY COALESCE(m.paid_expires_at,m.trial_expires_at) LIMIT 501',
        )
        .all(),
      db
        .prepare(
          "SELECT action,subject,created_at,actor FROM manager_audit WHERE action LIKE 'Plano%' OR action LIKE 'Renova%' ORDER BY created_at DESC LIMIT 100",
        )
        .all(),
      db
        .prepare(
          'SELECT n.id,n.subject,n.created_at,n.sent_at,n.attempted_at,a.email FROM profile_notices n JOIN auth_accounts a ON a.id=n.owner_id ORDER BY n.created_at DESC LIMIT 100',
        )
        .all(),
    ]);
    return json({
      plans,
      reminders: settings ? JSON.parse(settings.data_json) : reminderDefaults,
      reminderVersion: settings?.version ?? 0,
      members: members.results
        .slice(0, 500)
        .map((m) => ({ ...m, state: profileAccess(m as never) })),
      truncated: members.results.length > 500,
      audit: audit.results,
      deliveries: deliveries.results,
    });
  } catch {
    return json({ error: 'Não foi possível carregar as subscrições.' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado.' }, 403);
  try {
    const b = await profileBody(request);
    const settings = validateReminderSettings(b);
    if (!Number.isInteger(b.version) || Number(b.version) < 0)
      throw Error('Versão inválida.');
    const db = database(),
      now = new Date().toISOString();
    const results = await db.batch([
      db
        .prepare(
          "INSERT INTO manager_preferences(id,data_json,version,updated_at,updated_by) SELECT 'renewal-messages',?,1,?,? WHERE COALESCE((SELECT version FROM manager_preferences WHERE id='renewal-messages'),0)=? ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,version=manager_preferences.version+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by",
        )
        .bind(JSON.stringify(settings), now, user.userId, b.version),
      db
        .prepare('INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0')
        .bind(
          crypto.randomUUID(),
          user.userId,
          'Renovação: mensagem actualizada',
          JSON.stringify(settings),
          now,
        ),
    ]);
    return results[0].meta.changes
      ? json({ ok: true })
      : json(
          { error: 'As definições mudaram. Actualize antes de guardar.' },
          409,
        );
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQL|D1|constraint/i.test(e.message)
            ? e.message
            : 'Não foi possível guardar.',
      },
      422,
    );
  }
}
