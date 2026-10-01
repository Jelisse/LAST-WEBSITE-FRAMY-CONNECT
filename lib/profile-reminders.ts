import {
  reminderDefaults,
  renderReminder,
  type ReminderSettings,
} from './subscription-settings';
import { profileAccess, expiryDate, type Membership } from './entitlement';
type ReminderEnv = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  PROFILE_EMAIL_FROM?: string;
  PUBLIC_SITE_URL?: string;
};
export async function profileReminders(env: ReminderEnv, now = Date.now()) {
  const config = await env.DB.prepare(
    "SELECT data_json FROM manager_preferences WHERE id='renewal-messages'",
  ).first<{ data_json: string }>();
  const settings: ReminderSettings = config
    ? JSON.parse(config.data_json)
    : reminderDefaults;
  const rows = await env.DB.prepare(
    "SELECT m.*,a.email,a.name FROM profile_membership_view m JOIN auth_accounts a ON a.id=m.owner_id AND a.active=1 WHERE (m.billing_enabled=1 OR m.plan_id<>'free-30') AND COALESCE(m.paid_expires_at,m.trial_expires_at) IS NOT NULL",
  ).all<Membership & { owner_id: string; email: string; name: string }>();
  const candidates: {
    id: string;
    owner: string;
    subject: string;
    message: string;
  }[] = [];
  for (const m of rows.results) {
    const expiry = expiryDate(m);
    if (!expiry) continue;
    const remaining = Date.parse(expiry) - now,
      state = profileAccess(m, now);
    const phase =
      remaining > 0 && remaining <= 86400000
        ? '1'
        : remaining > 86400000 && remaining <= settings.daysBefore * 86400000
          ? '7'
          : state === 'grace'
            ? 'grace'
            : state === 'basic'
              ? 'basic'
              : null;
    if (!phase) continue;
    let subject =
      phase === 'basic'
        ? 'O seu perfil está no modo de contacto básico'
        : phase === 'grace'
          ? 'Tem 7 dias para renovar o perfil'
          : `O seu perfil termina em ${Math.max(1, Math.ceil(remaining / 86400000))} dia(s)`;
    let message =
      phase === 'basic'
        ? 'Os seus dados continuam guardados. O perfil público mostra o nome, a fotografia e um contacto. Renove na sua conta para recuperar as funcionalidades.'
        : `O período termina em ${expiry.slice(0, 10)}. Não existe renovação automática. Depois tem 7 dias de tolerância; a seguir o perfil mostra apenas o contacto básico. Renove na sua conta Framy Connect.`;
    if (phase === '7' || phase === '1') {
      let terms: { name?: string; billingCycle?: string } = {};
      try {
        terms = JSON.parse(m.terms_json ?? '{}');
      } catch {
        /* Legacy membership. */
      }
      const values = {
        nome: m.name,
        plano: terms.name ?? m.plan_id,
        periodicidade: terms.billingCycle === 'annual' ? 'anual' : 'mensal',
        data_fim: new Date(expiry).toLocaleDateString('pt-MZ', {
          timeZone: 'Africa/Maputo',
        }),
        link_renovacao:
          (env.PUBLIC_SITE_URL ?? 'https://framyconnect.co.mz').replace(
            /\/$/,
            '',
          ) + '/perfil?plans=1',
      };
      subject = renderReminder(settings.subject, values);
      message = renderReminder(settings.message, values);
    }
    candidates.push({
      id: `${m.owner_id}:${expiry}:${phase}`,
      owner: m.owner_id,
      subject,
      message,
    });
  }
  // Query existing keys in bounded batches; don't queue a write for every active customer.
  for (let i = 0; i < candidates.length; i += 80) {
    const batch = candidates.slice(i, i + 80);
    const existing = await env.DB.prepare(
      `SELECT id FROM profile_notices WHERE id IN (${batch.map(() => '?').join(',')})`,
    )
      .bind(...batch.map((n) => n.id))
      .all<{ id: string }>();
    const ids = new Set(existing.results.map((n) => n.id));
    const pending = batch.filter((n) => !ids.has(n.id));
    if (pending.length)
      await env.DB.batch(
        pending.map((n) =>
          env.DB.prepare(
            'INSERT OR IGNORE INTO profile_notices(id,owner_id,subject,message,created_at) VALUES(?,?,?,?,?)',
          ).bind(n.id, n.owner, n.subject, n.message, now),
        ),
      );
  }
  // The dashboard notices work without email credentials. Provider delivery is optional.
  if (!settings.enabled || !env.RESEND_API_KEY || !env.PROFILE_EMAIL_FROM)
    return;
  const queued = await env.DB.prepare(
    'SELECT n.*,a.email FROM profile_notices n JOIN auth_accounts a ON a.id=n.owner_id AND a.active=1 WHERE n.sent_at IS NULL AND n.read_at IS NULL AND n.created_at>? AND (n.attempted_at IS NULL OR n.attempted_at<?) ORDER BY n.created_at LIMIT 25',
  )
    .bind(now - 23 * 3600000, now - 15 * 60000)
    .all<{ id: string; email: string; subject: string; message: string }>();
  const currentIds = new Set(candidates.map((n) => n.id));
  for (const n of queued.results) {
    if (!currentIds.has(n.id)) continue; // Never deliver a stale phase after renewal or expiry.
    const claimed = await env.DB.prepare(
      'UPDATE profile_notices SET attempted_at=? WHERE id=? AND sent_at IS NULL AND read_at IS NULL AND (attempted_at IS NULL OR attempted_at<?)',
    )
      .bind(now, n.id, now - 15 * 60000)
      .run();
    if (!claimed.meta.changes) continue;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': n.id,
        },
        body: JSON.stringify({
          from: env.PROFILE_EMAIL_FROM,
          to: [n.email],
          subject: n.subject,
          text: n.message,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok)
        await env.DB.prepare('UPDATE profile_notices SET sent_at=? WHERE id=?')
          .bind(now, n.id)
          .run();
    } catch {
      /* Retry within provider idempotency window; never log customer data. */
    }
  }
}
