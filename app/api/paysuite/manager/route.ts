import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import {
  paysuiteReady,
  reconcilePayment,
  type GatewayPayment,
} from '@/lib/server-paysuite';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado ao gestor.' }, 403);
  try {
    return json({
      ready: paysuiteReady(env),
      pricing: await env.DB.prepare(
        'SELECT * FROM checkout_pricing WHERE id=1',
      ).first(),
      payments: (
        await env.DB.prepare(
          'SELECT p.*,(SELECT e.status FROM payment_email_receipts e WHERE e.payment_id=p.id) AS receipt_status,o.configuration_json,o.status AS order_status,a.name,a.email FROM paysuite_payments p JOIN auth_accounts a ON a.id=p.owner_id LEFT JOIN paysuite_product_orders o ON o.id=p.target_id ORDER BY p.created_at DESC LIMIT 100',
        ).all()
      ).results,
    });
  } catch {
    return json(
      { error: 'Aplique a migração de pagamentos antes de configurar.' },
      503,
    );
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado ao gestor.' }, 403);
  try {
    const b = await profileBody(request);
    if (b.action === 'pricing') {
      for (const key of ['customer_design', 'team_design', 'maputo_delivery'])
        if (
          !Number.isSafeInteger(b[key]) ||
          Number(b[key]) < 0 ||
          Number(b[key]) > 10000000
        )
          throw Error('Valor inválido.');
      if (typeof b.enabled !== 'boolean' || !Number.isInteger(b.version))
        throw Error('Configuração inválida.');
      if (b.enabled && !paysuiteReady(env))
        throw Error(
          'Configure primeiro os segredos e a activação PaySuite no Cloudflare.',
        );
      const result = await env.DB.batch([
        env.DB.prepare(
          'UPDATE checkout_pricing SET customer_design=?,team_design=?,maputo_delivery=?,enabled=?,version=version+1 WHERE id=1 AND version=?',
        ).bind(
          b.customer_design,
          b.team_design,
          b.maputo_delivery,
          b.enabled ? 1 : 0,
          b.version,
        ),
        env.DB.prepare(
          "INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,'Preços de checkout actualizados','PaySuite',? WHERE changes()=1",
        ).bind(crypto.randomUUID(), user.userId, new Date().toISOString()),
      ]);
      if (!result[0].meta.changes)
        return json(
          { error: 'Preços alterados por outro gestor. Actualize.' },
          409,
        );
    } else if (b.action === 'reconcile') {
      const p = await env.DB.prepare(
        'SELECT * FROM paysuite_payments WHERE id=?',
      )
        .bind(String(b.id))
        .first<GatewayPayment>();
      if (!p) throw Error('Pagamento não encontrado.');
      const providerId =
        typeof b.providerId === 'string' &&
        /^[A-Za-z0-9-]{10,80}$/.test(b.providerId)
          ? b.providerId
          : undefined;
      if (!p.provider_id && !providerId)
        throw Error('Indique o ID PaySuite obtido no painel do prestador.');
      await reconcilePayment(env, p, providerId);
    } else if (b.action === 'fulfilled') {
      const result = await env.DB.batch([
        env.DB.prepare(
          "UPDATE paysuite_product_orders SET status='fulfilled' WHERE id=? AND status='paid' AND json_extract(configuration_json,'$.profileUsername') IS NOT NULL AND EXISTS(SELECT 1 FROM paysuite_payments p WHERE p.target_id=paysuite_product_orders.id AND p.status='paid' AND p.kind='product')",
        ).bind(String(b.id)),
        env.DB.prepare(
          "INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,'Encomenda PaySuite entregue',?,? WHERE changes()=1",
        ).bind(
          crypto.randomUUID(),
          user.userId,
          String(b.id),
          new Date().toISOString(),
        ),
      ]);
      if (!result[0].meta.changes)
        return json(
          {
            error:
              'Confirme que a encomenda está paga, tem perfil associado e ainda não foi entregue. Actualize a lista.',
          },
          409,
        );
    } else throw Error('Acção inválida.');
    return json({ ok: true });
  } catch {
    return json(
      {
        error:
          'Não foi possível actualizar. Confirme os valores, as credenciais e o estado do pedido.',
      },
      422,
    );
  }
}
