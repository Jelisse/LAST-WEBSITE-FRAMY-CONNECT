import { env } from 'cloudflare:workers';
export async function sendGuestEmail(
  email: string,
  subject: string,
  text: string,
  key: string,
) {
  if (!env.RESEND_API_KEY || !env.PROFILE_EMAIL_FROM) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({
        from: env.PROFILE_EMAIL_FROM,
        to: [email],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
export async function guestOrderEmails() {
  // Delete only abandoned, expired uploads. Order artwork remains available for fulfilment.
  const abandoned = await env.DB.prepare(
    'SELECT a.id FROM guest_stored_assets a JOIN guest_checkout_sessions s ON s.id=a.session_id WHERE s.expires_at<? AND NOT EXISTS(SELECT 1 FROM guest_purchases g WHERE g.session_id=s.id) LIMIT 12',
  )
    .bind(Date.now())
    .all<{ id: string }>();
  for (const asset of abandoned.results) {
    if (!env.PROFILE_PHOTOS) continue;
    try {
      await env.PROFILE_PHOTOS.delete('designs/' + asset.id);
      await env.DB.prepare('DELETE FROM guest_stored_assets WHERE id=?')
        .bind(asset.id)
        .run();
    } catch {
      /* Retry cleanup later. */
    }
  }
  await env.DB.prepare(
    'DELETE FROM guest_order_access WHERE token_hash IN (SELECT token_hash FROM guest_order_access WHERE expires_at<? LIMIT 100)',
  )
    .bind(Date.now())
    .run();

  const now = Date.now();
  await env.DB.prepare(
    "UPDATE guest_order_emails SET status='review' WHERE status='pending' AND first_attempt_at<?",
  )
    .bind(now - 23 * 3600000)
    .run();
  const rows = await env.DB.prepare(
    "SELECT e.order_id,g.email,o.public_reference FROM guest_order_emails e JOIN guest_purchases g ON g.id=e.order_id JOIN paysuite_product_orders o ON o.id=e.order_id WHERE e.status='pending' AND (e.attempted_at IS NULL OR e.attempted_at<?) LIMIT 12",
  )
    .bind(now - 15 * 60000)
    .all<{ order_id: string; public_reference: string; email: string }>();
  for (const row of rows.results) {
    const result = await env.DB.prepare(
      "UPDATE guest_order_emails SET first_attempt_at=COALESCE(first_attempt_at,?),attempted_at=? WHERE order_id=? AND status='pending' AND (attempted_at IS NULL OR attempted_at<?)",
    )
      .bind(now, now, row.order_id, now - 15 * 60000)
      .run();
    if (!result.meta.changes) continue;
    if (
      await sendGuestEmail(
        row.email,
        'Referência da encomenda · Framy Connect',
        'A sua encomenda foi registada. Isto não confirma o pagamento.\nReferência: ' +
          row.public_reference +
          '\nAcompanhe o progresso sem conta: https://framyconnect.co.mz/acompanhar?referencia=' +
          row.public_reference +
          '\nGuarde a referência. A confirmação do pagamento será enviada separadamente.',
        'guest-order/' + row.order_id,
      )
    )
      await env.DB.prepare(
        "UPDATE guest_order_emails SET status='sent' WHERE order_id=?",
      )
        .bind(row.order_id)
        .run();
  }
}
