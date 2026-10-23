import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
export async function GET() {
  const user = await getChatGPTUser();
  if (!user || !['manager', 'agent'].includes(user.role))
    return json({ error: 'Acesso reservado.' }, 403);
  try {
    const rows = await env.DB.prepare(
      "SELECT o.id,o.public_reference,o.status,o.configuration_json,COALESCE(a.name,g.name) AS name,COALESCE(a.email,g.email) AS email,r.agent_id,COALESCE(r.stage,CASE WHEN o.status='fulfilled' THEN 'delivered' ELSE 'confirmed' END) AS stage,COALESCE(r.version,0) AS version FROM paysuite_product_orders o JOIN paysuite_payments p ON p.target_id=o.id AND p.kind='product' AND p.status='paid' AND NOT EXISTS(SELECT 1 FROM manager_audit ma WHERE ma.actor='paysuite' AND ma.action='refund.success' AND ma.subject=p.id) LEFT JOIN auth_accounts a ON a.id=o.owner_id LEFT JOIN guest_purchases g ON g.id=o.id LEFT JOIN order_progress r ON r.order_id=o.id WHERE (?='manager' OR r.agent_id=?) ORDER BY o.created_at DESC LIMIT 100",
    )
      .bind(user.role, user.userId)
      .all();
    const agents =
      user.role === 'manager'
        ? (
            await env.DB.prepare(
              "SELECT id,name FROM auth_accounts WHERE role='agent' AND active=1 ORDER BY name LIMIT 500",
            ).all()
          ).results
        : [];
    return json({
      orders: rows.results,
      agents,
      manager: user.role === 'manager',
    });
  } catch {
    return json({ error: 'Não foi possível carregar.' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || !['manager', 'agent'].includes(user.role))
    return json({ error: 'Acesso reservado.' }, 403);
  try {
    const b = await profileBody(request);
    const id = typeof b.id === 'string' ? b.id : '';
    const row = await env.DB.prepare(
      "SELECT o.status,o.configuration_json,r.agent_id,COALESCE(r.stage,'confirmed') AS stage,COALESCE(r.version,0) AS version FROM paysuite_product_orders o JOIN paysuite_payments p ON p.target_id=o.id AND p.kind='product' AND p.status='paid' AND NOT EXISTS(SELECT 1 FROM manager_audit ma WHERE ma.actor='paysuite' AND ma.action='refund.success' AND ma.subject=p.id) LEFT JOIN order_progress r ON r.order_id=o.id WHERE o.id=?",
    )
      .bind(id)
      .first<{
        status: string;
        configuration_json: string;
        agent_id: string | null;
        stage: string;
        version: number;
      }>();
    if (
      !row ||
      row.status === 'fulfilled' ||
      (user.role === 'agent' && row.agent_id !== user.userId)
    )
      return json({ error: 'Pedido indisponível.' }, 403);
    if (b.version !== row.version)
      return json({ error: 'Dados alterados. Actualize a lista.' }, 409);
    let stage = row.stage,
      agent = row.agent_id;
    if (b.action === 'assign') {
      if (user.role !== 'manager')
        return json({ error: 'Acesso reservado.' }, 403);
      agent = typeof b.agentId === 'string' && b.agentId ? b.agentId : null;
      if (
        agent &&
        !(await env.DB.prepare(
          "SELECT id FROM auth_accounts WHERE id=? AND role='agent' AND active=1",
        )
          .bind(agent)
          .first())
      )
        throw Error();
    } else if (b.action === 'advance') {
      const mode = JSON.parse(row.configuration_json).fulfilment?.mode;
      stage = (
        {
          confirmed: 'preparing',
          preparing: mode === 'pickup' ? 'ready' : 'dispatched',
          ready: 'delivered',
          dispatched: 'delivered',
        } as Record<string, string>
      )[row.stage];
      if (!stage) throw Error();
    } else throw Error();
    const now = new Date().toISOString();
    const result = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO order_progress(order_id,agent_id,stage,version,updated_at) SELECT ?,?,?,1,? WHERE (?=0 OR EXISTS(SELECT 1 FROM order_progress WHERE order_id=?)) AND EXISTS(SELECT 1 FROM paysuite_payments p JOIN paysuite_product_orders o ON o.id=p.target_id WHERE p.id=? AND p.kind='product' AND p.status='paid' AND o.status='paid' AND NOT EXISTS(SELECT 1 FROM manager_audit ma WHERE ma.actor='paysuite' AND ma.action='refund.success' AND ma.subject=p.id)) ON CONFLICT(order_id) DO UPDATE SET agent_id=?,stage=?,version=version+1,updated_at=? WHERE order_progress.version=?`,
      ).bind(
        id,
        agent,
        stage,
        now,
        row.version,
        id,
        id,
        agent,
        stage,
        now,
        row.version,
      ),
      env.DB.prepare(
        'INSERT INTO order_progress_events(id,order_id,stage,actor,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
      ).bind(
        crypto.randomUUID(),
        id,
        b.action === 'assign' ? 'assigned' : stage,
        user.userId,
        now,
      ),
      env.DB.prepare(
        "UPDATE paysuite_product_orders SET status='fulfilled' WHERE id=? AND status='paid' AND EXISTS(SELECT 1 FROM order_progress WHERE order_id=? AND stage='delivered')",
      ).bind(id, id),
      env.DB.prepare(
        "INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,'Progresso da encomenda actualizado',?,? WHERE EXISTS(SELECT 1 FROM order_progress_events WHERE order_id=? AND actor=? AND created_at=?)",
      ).bind(crypto.randomUUID(), user.userId, id, now, id, user.userId, now),
    ]);
    if (!result[0].meta.changes)
      return json({ error: 'Dados alterados. Actualize a lista.' }, 409);
    return json({ ok: true });
  } catch {
    return json({ error: 'Não foi possível actualizar o progresso.' }, 422);
  }
}
