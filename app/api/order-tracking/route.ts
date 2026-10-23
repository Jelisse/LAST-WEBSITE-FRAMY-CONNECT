import { normalizeReference } from '@/lib/public-reference';
import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
import { guestOwns, guestHash, randomToken } from '@/lib/guest-checkout';
import { sendGuestEmail } from '@/lib/guest-order-email';
import { reconcilePayment, type GatewayPayment } from '@/lib/server-paysuite';
export async function POST(request: Request) {
  try {
    const b = await profileBody(request);
    if (!(await rateLimit(request, 'track-order', 100)))
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    const reference = normalizeReference(
      typeof b.reference === 'string' ? b.reference : '',
    );
    if (!reference) return json({ error: 'Referência não encontrada.' }, 404);
    const p = await env.DB.prepare(
      "SELECT p.*,o.public_reference AS order_reference,o.status AS order_status,o.configuration_json FROM paysuite_payments p JOIN paysuite_product_orders o ON o.id=p.target_id WHERE (p.id=? OR p.public_reference=? OR o.public_reference=?) AND p.kind='product'",
    )
      .bind(reference, reference, reference)
      .first<
        GatewayPayment & {
          order_reference: string;
          order_status: string;
          configuration_json: string;
        }
      >();
    if (!p) return json({ error: 'Referência não encontrada.' }, 404);
    const id = p.id;
    const user = await getChatGPTUser();
    const guest = await env.DB.prepare(
      'SELECT name,email FROM guest_purchases WHERE id=?',
    )
      .bind(id)
      .first<{ name: string; email: string }>();
    if (b.action === 'access') {
      if (!(await rateLimit(request, 'track-email', 5)))
        return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
      if (guest) {
        const now = Date.now();
        const claim = await env.DB.prepare(
          'UPDATE guest_purchases SET last_access_sent=? WHERE id=? AND (last_access_sent IS NULL OR last_access_sent<?)',
        )
          .bind(now, id, now - 5 * 60000)
          .run();
        if (claim.meta.changes) {
          const token = randomToken();
          await env.DB.prepare(
            'INSERT INTO guest_order_access(token_hash,order_id,expires_at) VALUES(?,?,?)',
          )
            .bind(await guestHash(token), id, now + 30 * 60000)
            .run();
          const sent = await sendGuestEmail(
            guest.email,
            'Acesso à encomenda · Framy Connect',
            'Abra este link para consultar os detalhes da encomenda ou associá-la à sua conta. Expira em 30 minutos.\nhttps://framyconnect.co.mz/acompanhar?referencia=' +
              p.order_reference +
              '#' +
              token,
            'guest-access/' + (await guestHash(token)),
          );
          if (!sent)
            await env.DB.prepare(
              'DELETE FROM guest_order_access WHERE token_hash=?',
            )
              .bind(await guestHash(token))
              .run();
        }
      }
      return json({
        message:
          'Se disponível, o link foi enviado para o email do comprador. Verifique a caixa de entrada.',
      });
    }
    const token =
      typeof b.token === 'string' && /^[a-f0-9]{64}$/.test(b.token)
        ? b.token
        : '';
    const proof = token
      ? !!(await env.DB.prepare(
          'SELECT order_id FROM guest_order_access WHERE token_hash=? AND order_id=? AND expires_at>?',
        )
          .bind(await guestHash(token), id, Date.now())
          .first())
      : false;
    const owns =
      user?.userId === p.owner_id ||
      (!p.owner_id && (await guestOwns(request, id)));
    if (b.action === 'claim') {
      if (
        !user ||
        !['customer', 'agent'].includes(user.role) ||
        !proof ||
        !guest ||
        user.email.toLowerCase() !== guest.email ||
        p.owner_id ||
        p.status !== 'paid'
      )
        return json(
          { error: 'Confirme o email da compra e entre com o mesmo endereço.' },
          403,
        );
      const now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE paysuite_product_orders SET owner_id=? WHERE id=? AND owner_id IS NULL AND status IN ('paid','fulfilled')",
        ).bind(user.userId, id),
        env.DB.prepare(
          'UPDATE paysuite_payments SET owner_id=? WHERE id=? AND owner_id IS NULL AND EXISTS(SELECT 1 FROM paysuite_product_orders WHERE id=? AND owner_id=?)',
        ).bind(user.userId, id, id, user.userId),
        env.DB.prepare(
          "UPDATE paysuite_product_orders SET configuration_json=json_set(configuration_json,'$.profileUsername',(SELECT username FROM profiles WHERE owner_id=? AND published_json IS NOT NULL),'$.profileSnapshot',json((SELECT published_json FROM profiles WHERE owner_id=? AND published_json IS NOT NULL))) WHERE id=? AND owner_id=? AND json_extract(configuration_json,'$.profileUsername') IS NULL",
        ).bind(user.userId, user.userId, id, user.userId),
        env.DB.prepare('DELETE FROM guest_order_access WHERE order_id=?').bind(
          id,
        ),
        env.DB.prepare(
          "INSERT INTO manager_audit(id,actor,action,subject,created_at) VALUES(?,?,'Compra convidada associada à conta',?,?)",
        ).bind(crypto.randomUUID(), user.userId, id, now),
      ]);
      return json({ claimed: true });
    }
    const privateAccess = owns || proof;
    if (
      privateAccess &&
      p.provider_id &&
      ['pending', 'creating'].includes(p.status) &&
      (await rateLimit(request, 'guest-payment-status', 30))
    ) {
      try {
        p.status = await reconcilePayment(env, p);
      } catch {
        /* Webhook/cron retry. */
      }
    }
    const progress = await env.DB.prepare(
      'SELECT stage,version,updated_at FROM order_progress WHERE order_id=?',
    )
      .bind(id)
      .first();
    const events = await env.DB.prepare(
      'SELECT stage,created_at FROM order_progress_events WHERE order_id=? ORDER BY created_at LIMIT 30',
    )
      .bind(id)
      .all();
    const refunded = !!(await env.DB.prepare(
      "SELECT id FROM manager_audit WHERE actor='paysuite' AND action='refund.success' AND subject=? LIMIT 1",
    )
      .bind(id)
      .first());
    const config = JSON.parse(p.configuration_json);
    return json({
      id,
      reference: p.order_reference,
      paymentStatus: refunded ? 'refunded' : p.status,
      stage: refunded
        ? null
        : p.order_status === 'fulfilled'
          ? 'delivered'
          : p.status === 'paid'
            ? progress?.stage || 'confirmed'
            : null,
      history: events.results,
      deliveryMode: config.fulfilment?.mode ?? null,
      privateAccess,
      guest: !p.owner_id,
      ...(privateAccess
        ? {
            amount: p.amount,
            buyerName: guest?.name,
            buyerEmail: guest?.email,
            contact: config.contact,
            address: config.address,
            fulfilment: config.fulfilment,
            url: !refunded && p.status === 'pending' ? p.checkout_url : null,
            canClaim:
              !!user &&
              !!proof &&
              !!guest &&
              user.email.toLowerCase() === guest.email &&
              !p.owner_id &&
              p.status === 'paid',
          }
        : {}),
    });
  } catch {
    return json(
      { error: 'Não foi possível consultar a encomenda. Tente novamente.' },
      503,
    );
  }
}
