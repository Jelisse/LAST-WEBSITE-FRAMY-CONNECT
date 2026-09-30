import { env } from 'cloudflare:workers';
import { verifyPaySuiteSignature } from '@/lib/paysuite';
import { reconcilePayment, type GatewayPayment } from '@/lib/server-paysuite';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!env.PAYSUITE_WEBHOOK_SECRET || !env.PAYSUITE_API_TOKEN)
    return new Response(null, { status: 503 });
  try {
    const reader = request.body?.getReader();
    if (!reader) return new Response(null, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 16384) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(chunk.value);
    }
    const raw = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      raw.set(chunk, offset);
      offset += chunk.length;
    }
    if (
      !(await verifyPaySuiteSignature(
        raw,
        request.headers.get('X-Signature') ?? '',
        env.PAYSUITE_WEBHOOK_SECRET,
      ))
    )
      return new Response(null, { status: 401 });
    const event = JSON.parse(new TextDecoder().decode(raw));
    if (
      ![
        'payment.success',
        'payment.failed',
        'refund.success',
        'refund.failed',
      ].includes(event.event)
    )
      return new Response(null, { status: 204 });
    const data = event.data;
    if (!data || typeof data.id !== 'string')
      return new Response(null, { status: 400 });
    if (event.event.startsWith('refund.')) {
      // Refund policy requires review; never guess how to revoke delivered hardware or access.
      await env.DB.prepare(
        "INSERT OR IGNORE INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,'paysuite',?,id,? FROM paysuite_payments WHERE provider_id=?",
      )
        .bind(
          `ps-refund-${data.id}`,
          event.event,
          new Date().toISOString(),
          data.payment_id ?? '',
        )
        .run();
      return new Response(null, { status: 204 });
    }
    if (typeof data.reference !== 'string')
      return new Response(null, { status: 400 });
    const payment = await env.DB.prepare(
      'SELECT * FROM paysuite_payments WHERE id=?',
    )
      .bind(data.reference)
      .first<GatewayPayment>();
    if (!payment) return new Response(null, { status: 204 });
    // HMAC authenticates the sender; API lookup verifies final status and the exact amount.
    await reconcilePayment(env, payment, data.id);
    await env.DB.prepare(
      'INSERT OR IGNORE INTO paysuite_events(fingerprint,payment_id,event,received_at) VALUES(?,?,?,?)',
    )
      .bind(
        `${data.id}:${event.event}`,
        payment.id,
        event.event,
        new Date().toISOString(),
      )
      .run();
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
