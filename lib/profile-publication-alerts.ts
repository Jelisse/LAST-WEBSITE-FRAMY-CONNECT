import { publicSiteURL } from './site-url';
type AlertEnv = {
  DB: D1Database;
  RESEND_API_KEY?: string;
  PROFILE_EMAIL_FROM?: string;
  PUBLIC_SITE_URL?: string;
};
export async function profilePublicationAlerts(
  env: AlertEnv,
  now = Date.now(),
) {
  const site = publicSiteURL(env.PUBLIC_SITE_URL);
  if (!site || !env.RESEND_API_KEY || !env.PROFILE_EMAIL_FROM) return;
  await env.DB.prepare(
    "UPDATE profile_publication_alerts SET status='review' WHERE status='pending' AND first_attempt_at IS NOT NULL AND first_attempt_at<=?",
  )
    .bind(now - 23 * 3600000)
    .run();
  const rows = await env.DB.prepare(
    "SELECT owner_id,username,name FROM profile_publication_alerts WHERE status='pending' AND (attempted_at IS NULL OR attempted_at<?) ORDER BY created_at LIMIT 10",
  )
    .bind(now - 15 * 60000)
    .all<{ owner_id: string; username: string; name: string }>();
  for (const row of rows.results) {
    const claim = await env.DB.prepare(
      "UPDATE profile_publication_alerts SET first_attempt_at=COALESCE(first_attempt_at,?),attempted_at=? WHERE owner_id=? AND status='pending' AND (attempted_at IS NULL OR attempted_at<?)",
    )
      .bind(now, now, row.owner_id, now - 15 * 60000)
      .run();
    if (!claim.meta.changes) continue;
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'profile-publication/' + row.owner_id,
        },
        body: JSON.stringify({
          from: env.PROFILE_EMAIL_FROM,
          to: ['firminochambale@framyconnect.co.mz'],
          subject: 'Novo perfil publicado — Framy Connect',
          text: `Um novo perfil foi publicado na Framy Connect.\nNome: ${row.name}\nPerfil: ${site.origin}/${encodeURIComponent(row.username)}\nEste aviso é enviado uma única vez por conta. A disponibilidade posterior depende do estado actual do perfil.`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      const body = (await r.json()) as { id?: string };
      if (r.ok && typeof body.id === 'string' && body.id)
        await env.DB.prepare(
          "UPDATE profile_publication_alerts SET status='sent',sent_at=? WHERE owner_id=? AND status='pending'",
        )
          .bind(now, row.owner_id)
          .run();
    } catch {
      /* Durable queue retries within the provider deduplication window. Never block publication or log private payloads. */
    }
  }
}
