import { paymentReceipts } from './payment-receipts';
import {
  paysuiteRequest,
  checkoutURL,
  minorAmount,
  billingPeriodEnd,
  type PaySuiteMethod,
} from './paysuite.ts';

export type GatewayPayment = {
  id: string;
  owner_id: string;
  kind: 'product' | 'subscription';
  target_id: string;
  amount: number;
  method: PaySuiteMethod;
  cycle: 'once' | 'monthly' | 'annual';
  provider_id: string | null;
  checkout_url: string | null;
  status: string;
};
export function paysuiteReady(env: Cloudflare.Env) {
  return (
    env.PAYSUITE_ENABLED === 'true' &&
    !!env.PAYSUITE_API_TOKEN &&
    !!env.PAYSUITE_WEBHOOK_SECRET &&
    env.PUBLIC_SITE_URL === 'https://framyconnect.co.mz'
  );
}
export async function launchPayment(
  env: Cloudflare.Env,
  payment: GatewayPayment,
) {
  if (!paysuiteReady(env)) throw Error('Pagamentos indisponíveis.');
  // Only the request which inserted the creating row may call this function.
  // A timeout is ambiguous: never automatically repeat a charge-creation POST.
  const data = await paysuiteRequest(env.PAYSUITE_API_TOKEN!, '/payments', {
    amount: (payment.amount / 100).toFixed(2),
    method: payment.method,
    reference: payment.id,
    description:
      payment.kind === 'product'
        ? 'Framy Connect - produtos'
        : 'Framy Connect - perfil digital',
    return_url: `${env.PUBLIC_SITE_URL}/checkout/retorno?payment=${payment.id}`,
    callback_url: `${env.PUBLIC_SITE_URL}/api/paysuite/webhook`,
  });
  if (
    typeof data.id !== 'string' ||
    !/^[A-Za-z0-9-]{10,80}$/.test(data.id) ||
    data.reference !== payment.id ||
    minorAmount(data.amount) !== payment.amount
  )
    throw Error('Resposta de pagamento inválida.');
  const url = checkoutURL(data.checkout_url);
  await env.DB.prepare(
    "UPDATE paysuite_payments SET provider_id=COALESCE(provider_id,?),checkout_url=?,status=CASE WHEN status='creating' THEN 'pending' ELSE status END,updated_at=? WHERE id=? AND (provider_id IS NULL OR provider_id=?)",
  )
    .bind(data.id, url, new Date().toISOString(), payment.id, data.id)
    .run();
  return url;
}
export async function reconcilePayment(
  env: Cloudflare.Env,
  payment: GatewayPayment,
  notifiedId?: string,
) {
  const providerId = payment.provider_id ?? notifiedId;
  if (!providerId || !/^[A-Za-z0-9-]{10,80}$/.test(providerId))
    return payment.status;
  if (payment.provider_id && notifiedId && payment.provider_id !== notifiedId)
    throw Error('Referência de pagamento inválida.');
  const data = await paysuiteRequest(
    env.PAYSUITE_API_TOKEN!,
    `/payments/${encodeURIComponent(providerId)}`,
  );
  if (
    data.id !== providerId ||
    data.reference !== payment.id ||
    minorAmount(data.amount) !== payment.amount ||
    (data.currency !== undefined && data.currency !== 'MZN')
  )
    throw Error('Pagamento não corresponde ao pedido.');
  await env.DB.prepare(
    'UPDATE paysuite_payments SET provider_id=COALESCE(provider_id,?) WHERE id=? AND (provider_id IS NULL OR provider_id=?)',
  )
    .bind(providerId, payment.id, providerId)
    .run();
  if (payment.status === 'paid') return 'paid';
  if (data.status === 'paid') {
    if (!['creating', 'pending'].includes(payment.status)) {
      await env.DB.prepare(
        "UPDATE paysuite_payments SET status='review',updated_at=? WHERE id=? AND status<>'paid'",
      )
        .bind(new Date().toISOString(), payment.id)
        .run();
      return 'review';
    }
    await settlePayment(env.DB, payment, providerId);
  } else if (data.status === 'failed' || data.status === 'cancelled') {
    await failGatewayPayment(env.DB, payment);
  }
  const finalStatus = (await env.DB.prepare(
    'SELECT status FROM paysuite_payments WHERE id=?',
  )
    .bind(payment.id)
    .first<{ status: string }>())!.status;
  if (finalStatus === 'paid') {
    try {
      await paymentReceipts(env, payment.id);
    } catch {
      /* Durable outbox retries independently. */
    }
  }
  return finalStatus;
}
export async function failGatewayPayment(
  db: D1Database,
  payment: GatewayPayment,
) {
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        "UPDATE paysuite_payments SET status='failed',updated_at=? WHERE id=? AND status IN ('creating','pending')",
      )
      .bind(now, payment.id),
    payment.kind === 'product'
      ? db
          .prepare(
            "UPDATE paysuite_product_orders SET status='failed' WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM paysuite_payments WHERE id=? AND status='failed')",
          )
          .bind(payment.target_id, payment.id)
      : db
          .prepare(
            "UPDATE profile_invoices SET status='cancelled' WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM paysuite_payments WHERE id=? AND status='failed')",
          )
          .bind(payment.target_id, payment.id),
    db
      .prepare(
        "UPDATE paysuite_stock_reservations SET released=1 WHERE order_id=? AND EXISTS(SELECT 1 FROM paysuite_payments WHERE id=? AND kind='product' AND status='failed')",
      )
      .bind(payment.target_id, payment.id),
  ]);
}
// Abandoned checkouts must not reserve stock or block the pending-order limit
// forever. Staleness uses created_at: reconciliation keeps touching updated_at.
// A launch that never reached the provider ('creating') has no charge to lose.
export async function expireStaleProductPayments(db: D1Database, now = Date.now()) {
  const stale = await db
    .prepare(
      "SELECT * FROM paysuite_payments WHERE kind='product' AND ((status='creating' AND created_at<=?) OR (status='pending' AND created_at<=?)) ORDER BY created_at LIMIT 25",
    )
    .bind(
      new Date(now - 3600000).toISOString(),
      new Date(now - 86400000).toISOString(),
    )
    .all<GatewayPayment>();
  for (const payment of stale.results) await failGatewayPayment(db, payment);
  return stale.results.length;
}
export async function settlePayment(
  db: D1Database,
  payment: GatewayPayment,
  providerId: string,
) {
  const now = new Date().toISOString();
  if (payment.kind === 'product') {
    await db.batch([
      db
        .prepare(
          "UPDATE paysuite_product_orders SET status='paid' WHERE id=? AND status='pending' AND amount=? AND EXISTS(SELECT 1 FROM paysuite_payments WHERE id=? AND status IN ('pending','creating'))",
        )
        .bind(payment.target_id, payment.amount, payment.id),
      db
        .prepare(
          "UPDATE paysuite_payments SET status='paid',updated_at=? WHERE id=? AND status IN ('pending','creating') AND EXISTS(SELECT 1 FROM paysuite_product_orders WHERE id=? AND status='paid')",
        )
        .bind(now, payment.id, payment.target_id),
    ]);
    return;
  }
  const invoice = await db
    .prepare('SELECT * FROM profile_invoices WHERE id=?')
    .bind(payment.target_id)
    .first<{
      id: string;
      owner_id: string;
      plan_id: string;
      terms_json: string;
      status: string;
      amount: number;
    }>();
  if (
    !invoice ||
    invoice.owner_id !== payment.owner_id ||
    invoice.amount !== payment.amount
  )
    throw Error('Pedido de subscrição inválido.');
  if (invoice.status !== 'pending') {
    const receipt = await db
      .prepare('SELECT reference FROM profile_receipts WHERE invoice_id=?')
      .bind(invoice.id)
      .first<{ reference: string }>();
    const state =
      receipt?.reference === `paysuite:${providerId}` ? 'paid' : 'review';
    await db
      .prepare(
        "UPDATE paysuite_payments SET status=?,updated_at=? WHERE id=? AND status<>'paid'",
      )
      .bind(state, now, payment.id)
      .run();
    return;
  }
  const member = await db
    .prepare('SELECT * FROM profile_membership_view WHERE owner_id=?')
    .bind(payment.owner_id)
    .first<{
      version: number;
      plan_id: string;
      terms_json: string | null;
      paid_started_at: string | null;
      paid_expires_at: string | null;
      next_starts_at: string | null;
    }>();
  if (!member || (member.next_starts_at && member.next_starts_at > now))
    throw Error('A subscrição necessita de revisão.');
  const start =
    member.paid_expires_at && member.paid_expires_at > now
      ? member.paid_expires_at
      : now;
  const end = billingPeriodEnd(
    start,
    payment.cycle === 'annual' ? 'annual' : 'monthly',
  );
  const scheduled = start > now;
  const reference = `paysuite:${providerId}`;
  const results = await db.batch([
    db
      .prepare(
        "INSERT OR IGNORE INTO profile_receipts(reference,invoice_id,actor,amount,created_at) SELECT ?,?,'paysuite',?,? WHERE EXISTS(SELECT 1 FROM sandbox_memberships WHERE owner_id=? AND version=?) AND EXISTS(SELECT 1 FROM profile_invoices WHERE id=? AND status='pending') AND EXISTS(SELECT 1 FROM paysuite_payments WHERE id=? AND status IN ('pending','creating'))",
      )
      .bind(
        reference,
        invoice.id,
        payment.amount,
        now,
        payment.owner_id,
        member.version,
        invoice.id,
        payment.id,
      ),
    db
      .prepare(
        scheduled
          ? `UPDATE sandbox_memberships SET plan_id=?,terms_json=?,paid_started_at=?,paid_expires_at=?,next_plan_id=?,next_terms_json=?,next_starts_at=?,next_expires_at=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?) AND EXISTS(SELECT 1 FROM profile_invoices WHERE id=? AND status='pending')`
          : `UPDATE sandbox_memberships SET plan_id=?,terms_json=?,paid_started_at=?,paid_expires_at=?,next_plan_id=NULL,next_terms_json=NULL,next_starts_at=NULL,next_expires_at=NULL,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?) AND EXISTS(SELECT 1 FROM profile_invoices WHERE id=? AND status='pending')`,
      )
      .bind(
        ...(scheduled
          ? [
              member!.plan_id,
              member!.terms_json ?? null,
              member!.paid_started_at ?? null,
              member!.paid_expires_at ?? null,
            ]
          : []),
        invoice.plan_id,
        invoice.terms_json,
        scheduled
          ? start
          : member.plan_id === invoice.plan_id && start > now
            ? member.paid_started_at
            : now,
        end,
        now,
        payment.owner_id,
        member.version,
        reference,
        invoice.id,
        invoice.id,
      ),
    db
      .prepare(
        "UPDATE profile_invoices SET status='confirmed',confirmed_at=?,confirmed_by='paysuite',period_start=?,period_end=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?)",
      )
      .bind(now, start, end, invoice.id, reference, invoice.id),
    db
      .prepare(
        "UPDATE paysuite_payments SET status='paid',updated_at=? WHERE id=? AND status IN ('pending','creating') AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?)",
      )
      .bind(now, payment.id, reference, invoice.id),
  ]);
  if (
    !results[0].meta.changes &&
    !(await db
      .prepare(
        'SELECT reference FROM profile_receipts WHERE reference=? AND invoice_id=?',
      )
      .bind(reference, invoice.id)
      .first())
  )
    throw Error('Tente novamente a confirmação.');
}
