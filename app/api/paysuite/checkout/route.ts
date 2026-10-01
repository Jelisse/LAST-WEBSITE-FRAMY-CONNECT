import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { getProducts } from '@/lib/server-catalog';
import { getManagedPlans } from '@/lib/server-plans';
import { planMeticais, planAnnualMeticais } from '@/lib/plan-pricing';
import {
  configurationQuote,
  type CheckoutPricing,
} from '@/lib/checkout-pricing';
import { paymentMethod } from '@/lib/paysuite';
import {
  paysuiteReady,
  launchPayment,
  reconcilePayment,
  type GatewayPayment,
} from '@/lib/server-paysuite';
import { profileMembership } from '@/lib/server-profile-access';
import { hasActiveTrial } from '@/lib/entitlement';
import { cleanText } from '@/lib/profile-growth';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  const id = new URL(request.url).searchParams.get('payment');
  try {
    if (!id)
      return json({
        available: paysuiteReady(env),
        payments: (
          await env.DB.prepare(
            'SELECT p.id,p.kind,p.amount,p.cycle,p.status,p.created_at,o.status AS orderStatus FROM paysuite_payments p LEFT JOIN paysuite_product_orders o ON o.id=p.target_id AND o.owner_id=p.owner_id WHERE p.owner_id=? ORDER BY p.created_at DESC LIMIT 30',
          )
            .bind(user.userId)
            .all()
        ).results,
      });
    const row = await env.DB.prepare(
      'SELECT * FROM paysuite_payments WHERE id=? AND owner_id=?',
    )
      .bind(id, user.userId)
      .first<GatewayPayment>();
    if (!row) return json({ error: 'Pagamento não encontrado.' }, 404);
    if (
      row.provider_id &&
      ['pending', 'creating'].includes(row.status) &&
      (await rateLimit(request, 'ps-status', 60))
    ) {
      try {
        row.status = await reconcilePayment(env, row);
      } catch {
        /* Remain pending; webhook/cron retries. */
      }
    }
    const profile =
      row.kind === 'product' && row.status === 'paid'
        ? await env.DB.prepare(
            'SELECT username,published_json FROM profiles WHERE owner_id=?',
          )
            .bind(user.userId)
            .first<{ username: string; published_json: string | null }>()
        : null;
    return json({
      receiptStatus:
        row.status === 'paid'
          ? ((
              await env.DB.prepare(
                'SELECT status FROM payment_email_receipts WHERE payment_id=?',
              )
                .bind(row.id)
                .first<{ status: string }>()
            )?.status ?? null)
          : null,
      profileReady: !!profile?.published_json,
      id: row.id,
      kind: row.kind,
      amount: row.amount,
      status: row.status,
      cycle: row.cycle,
      orderStatus:
        row.kind === 'product'
          ? ((
              await env.DB.prepare(
                'SELECT status FROM paysuite_product_orders WHERE id=? AND owner_id=?',
              )
                .bind(row.target_id, user.userId)
                .first<{ status: string }>()
            )?.status ?? null)
          : null,
      url: row.status === 'pending' ? row.checkout_url : null,
    });
  } catch {
    return json({ error: 'Pagamentos temporariamente indisponíveis.' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  if (!['customer', 'agent'].includes(user.role))
    return json({ error: 'Use uma conta de cliente.' }, 403);
  if (!paysuiteReady(env))
    return json({ error: 'Pagamentos temporariamente indisponíveis.' }, 503);
  if (!(await rateLimit(request, 'ps-create', 12)))
    return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
  try {
    const b = await profileBody(request);
    const id = cleanText(b.requestId, 36, true);
    if (!/^[0-9a-f-]{36}$/.test(id) || b.accepted !== true)
      throw Error('Confirme o valor e as condições de pagamento.');
    const previous = await env.DB.prepare(
      'SELECT * FROM paysuite_payments WHERE id=?',
    )
      .bind(id)
      .first<GatewayPayment>();
    if (previous) {
      if (previous.owner_id !== user.userId)
        return json({ error: 'Referência inválida.' }, 409);
      return json({
        paymentId: id,
        url: previous.status === 'pending' ? previous.checkout_url : null,
        status: previous.status,
      });
    }
    const method = paymentMethod(b.method);
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    let amount: number;
    let cycle: 'once' | 'monthly' | 'annual';
    const kind = b.kind;
    if (kind === 'product') {
      const settings = await env.DB.prepare(
        'SELECT * FROM checkout_pricing WHERE id=1',
      ).first<CheckoutPricing>();
      if (!settings?.enabled)
        throw Error('Compras de produtos ainda indisponíveis.');
      const products = await getProducts();
      const quote = configurationQuote(products, settings, b);
      if (
        b.expectedAmount !== quote.total ||
        b.pricingVersion !== settings.version
      )
        throw Error('O preço mudou. Actualize a configuração.');
      const profile = await env.DB.prepare(
        'SELECT username,published_json FROM profiles WHERE owner_id=? AND published_json IS NOT NULL',
      )
        .bind(user.userId)
        .first<{ username: string; published_json: string }>();
      const contact = cleanText(b.contact, 50, true),
        address = cleanText(b.address, 300, true);
      if (contact.length < 7 || address.length < 8)
        throw Error('Preencha o contacto e a morada de entrega.');
      const configuration = {
        ...quote,
        contact,
        address,
        city: 'Maputo',
        profileUsername: profile?.username ?? null,
        profileSnapshot: profile ? JSON.parse(profile.published_json) : null,
        designInstructions: cleanText(b.designInstructions ?? '', 2000),
      };
      amount = quote.total;
      cycle = 'once';
      const guards = quote.priceIds
        .map(
          () =>
            'COALESCE((SELECT version FROM product_catalog WHERE id=?),0)=?',
        )
        .join(' AND ');
      statements.push(
        env.DB.prepare(
          `INSERT INTO paysuite_product_orders(id,owner_id,configuration_json,amount,status,created_at) SELECT ?,?,?,?,'pending',? WHERE EXISTS(SELECT 1 FROM checkout_pricing WHERE id=1 AND enabled=1 AND version=?) AND ${guards} AND (SELECT COUNT(*) FROM paysuite_product_orders WHERE owner_id=? AND status='pending')<3`,
        ).bind(
          id,
          user.userId,
          JSON.stringify(configuration),
          amount,
          now,
          settings.version,
          ...quote.priceIds.flatMap((pid) => [
            pid,
            products.find((p) => p.id === pid)!.version,
          ]),
          user.userId,
        ),
      );
      for (const pid of quote.ids)
        statements.push(
          env.DB.prepare(
            'INSERT INTO paysuite_stock_reservations(order_id,product_id,quantity) VALUES(?,?,1)',
          ).bind(id, pid),
        );
    } else if (kind === 'subscription') {
      if (b.cycle !== 'monthly' && b.cycle !== 'annual')
        throw Error('Período inválido.');
      cycle = b.cycle;
      const settings = await env.DB.prepare(
        'SELECT enabled FROM profile_billing_settings WHERE id=1',
      ).first<{ enabled: number }>();
      const member = await profileMembership(user.userId);
      if (!settings?.enabled || !member)
        throw Error('Subscrições indisponíveis.');
      if (hasActiveTrial(member))
        throw Error(
          'O pagamento do perfil estará disponível após os 30 dias grátis.',
        );
      if (member.next_starts_at && member.next_starts_at > now)
        throw Error('Já tem uma alteração de plano agendada.');
      const plan = (await getManagedPlans()).find(
        (p) => p.id === b.planId && p.active && p.id !== 'free-30',
      );
      if (
        !plan ||
        (cycle === 'annual'
          ? plan.annualEnabled === false
          : plan.monthlyEnabled === false) ||
        plan.version !== b.planVersion
      )
        throw Error('O plano mudou. Actualize antes de continuar.');
      amount = Math.round(
        (cycle === 'annual' ? planAnnualMeticais(plan) : planMeticais(plan)) *
          100,
      );
      if (
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        amount !== b.expectedAmount
      )
        throw Error('O preço mudou. Actualize antes de continuar.');
      statements.push(
        env.DB.prepare(
          "INSERT INTO profile_invoices(id,owner_id,plan_id,terms_json,instructions,amount,status,created_at,expires_at) VALUES(?,?,?,?,'PaySuite',?,'pending',?,?)",
        ).bind(
          id,
          user.userId,
          plan.id,
          JSON.stringify({ ...plan, billingCycle: cycle }),
          amount,
          now,
          new Date(Date.now() + 7 * 86400000).toISOString(),
        ),
      );
    } else throw Error('Pedido inválido.');
    const payment: GatewayPayment = {
      id,
      owner_id: user.userId,
      kind,
      target_id: id,
      amount,
      method,
      cycle,
      provider_id: null,
      checkout_url: null,
      status: 'creating',
    };
    statements.push(
      env.DB.prepare(
        "INSERT INTO paysuite_payments(id,owner_id,kind,target_id,amount,method,cycle,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'creating',?,?)",
      ).bind(id, user.userId, kind, id, amount, method, cycle, now, now),
    );
    await env.DB.batch(statements);
    try {
      return json({
        paymentId: id,
        url: await launchPayment(env, payment),
        status: 'pending',
      });
    } catch {
      return json(
        {
          paymentId: id,
          status: 'creating',
          message:
            'Pedido registado. Estamos a confirmar a ligação ao prestador; não repita o pagamento.',
        },
        202,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return json(
      {
        error: /stock/i.test(message)
          ? 'Stock insuficiente. Actualize a configuração.'
          : /constraint|D1|SQLITE|UNIQUE/i.test(message)
            ? 'Já existe um pedido pendente ou os dados mudaram. Consulte os seus pagamentos.'
            : message || 'Não foi possível preparar o pagamento.',
      },
      422,
    );
  }
}
