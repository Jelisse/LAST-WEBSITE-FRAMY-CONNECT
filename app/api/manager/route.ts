import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageOrders } from '@/lib/server-order-access';
import { database } from '@/lib/server-db';
import { getProducts } from '@/lib/server-catalog';
import { getManagedPlans } from '@/lib/server-plans';
import { transition, type SandboxOrder } from '@/lib/domain';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
async function authorized() {
  const user = await getChatGPTUser();
  return user && (await canManageOrders(user.userId)) ? user : null;
}
export async function GET() {
  try {
    const user = await authorized();
    if (!user) return json({ error: 'Acesso reservado ao Manager.' }, 403);
    const db = database();
    const [orders, agents, movements, audit, products, plans] =
      await Promise.all([
        db
          .prepare(
            `SELECT o.owner_id,o.data_json,p.published_json FROM sandbox_orders o LEFT JOIN profiles p ON p.owner_id=o.owner_id ORDER BY o.created_at DESC`,
          )
          .all<{
            owner_id: string;
            data_json: string;
            published_json: string | null;
          }>(),
        db
          .prepare(
            "SELECT id,data_json,version FROM manager_records WHERE kind='agent'",
          )
          .all<{ id: string; data_json: string; version: number }>(),
        db
          .prepare('SELECT * FROM stock_movements ORDER BY created_at DESC')
          .all(),
        db
          .prepare(
            'SELECT * FROM manager_audit ORDER BY created_at DESC LIMIT 100',
          )
          .all(),
        getProducts(),
        getManagedPlans(),
      ]);
    return json({
      orders: orders.results.map((r) => ({
        ...JSON.parse(r.data_json),
        ownerId: r.owner_id,
        profile: r.published_json ? JSON.parse(r.published_json) : null,
      })),
      agents: agents.results.map((r) => ({
        ...JSON.parse(r.data_json),
        id: r.id,
        version: r.version,
      })),
      movements: movements.results,
      audit: audit.results,
      products,
      plans,
    });
  } catch {
    return json({ error: 'Não foi possível carregar o Manager.' }, 503);
  }
}
const allReservedSQL =
  "SELECT COUNT(*) FROM sandbox_orders WHERE json_extract(data_json,'$.productId')=? AND json_extract(data_json,'$.status') IN ('QUEUED','IN_PRODUCTION','READY')";
const reservedSQL =
  "SELECT COUNT(*) FROM sandbox_orders WHERE json_extract(data_json,'$.productId')=? AND json_extract(data_json,'$.status') IN ('QUEUED','IN_PRODUCTION','READY') AND COALESCE(json_extract(data_json,'$.agentId'),'')=? AND COALESCE(json_extract(data_json,'$.agentId'),'')<>''";
export async function POST(request: Request) {
  try {
    const user = await authorized();
    if (!user) return json({ error: 'Acesso reservado ao Manager.' }, 403);
    if (request.headers.get('origin') !== new URL(request.url).origin)
      return json({ error: 'Origem não autorizada.' }, 403);
    const raw = await request.text();
    if (raw.length > 24000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw);
    const db = database(),
      now = new Date().toISOString(),
      eventId = crypto.randomUUID();
    const audit = (action: string, subject: string) =>
      db
        .prepare('INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0')
        .bind(eventId, user.userId, action, subject, now);
    const text = (key: string, max: number, optional = false) => {
      const v = b[key];
      if (
        typeof v !== 'string' ||
        v.trim().length > max ||
        (!optional && !v.trim())
      )
        throw Error('Campo inválido: ' + key);
      return v.trim();
    };
    const integer = (key: string, min: number, max: number) => {
      const n = b[key];
      if (!Number.isSafeInteger(n) || n < min || n > max)
        throw Error('Valor inválido: ' + key);
      return n as number;
    };
    if (b.action === 'agent' || b.action === 'plan') {
      const id = text('id', 70),
        version = integer('version', 0, 1000000);
      if (!/^[a-z0-9-]+$/.test(id)) throw Error('Referência inválida.');
      if (typeof b.active !== 'boolean') throw Error('Estado inválido.');
      let record;
      if (b.action === 'agent')
        record = {
          id,
          name: text('name', 90),
          email: text('email', 160, true),
          phone: text('phone', 50, true),
          active: b.active,
        };
      else {
        const dollars = Number(b.dollars);
        if (
          !Number.isFinite(dollars) ||
          dollars < 1 ||
          dollars > 10000 ||
          Math.abs(dollars * 100 - Math.round(dollars * 100)) > 0.0001
        )
          throw Error('Preço mensal inválido.');
        record = {
          id,
          name: text('name', 90),
          audience: text('audience', 90),
          description: text('description', 2000),
          dollars,
          links: integer('links', 1, 50),
          bio: integer('bio', 0, 1200),
          active: b.active,
        };
      }
      const result = await db.batch([
        db
          .prepare(
            `INSERT INTO manager_records(id,kind,data_json,version,updated_at) SELECT ?,?,?,1,? WHERE COALESCE((SELECT version FROM manager_records WHERE id=?),0)=? ON CONFLICT(id) DO UPDATE SET data_json=excluded.data_json,version=manager_records.version+1,updated_at=excluded.updated_at WHERE manager_records.kind=excluded.kind`,
          )
          .bind(id, b.action, JSON.stringify(record), now, id, version),
        audit(
          b.action === 'agent' ? 'Agente actualizado' : 'Plano actualizado',
          record.name,
        ),
      ]);
      if (!result[0].meta.changes)
        return json(
          { error: 'Este registo mudou. Actualize antes de guardar.' },
          409,
        );
      return json({ ok: true });
    }
    if (b.action === 'stock' || b.action === 'stock-transfer') {
      const productId = text('productId', 70),
        quantity = integer('quantity', -100000, 100000),
        reason = text('reason', 250),
        id = text('id', 70);
      if (!quantity || !/^[-a-z0-9]+$/.test(id))
        throw Error('Movimento inválido.');
      if (!(await getProducts()).some((p) => p.id === productId))
        throw Error('Produto inválido.');
      const destination = typeof b.agentId === 'string' ? b.agentId : '';
      const source = typeof b.fromAgentId === 'string' ? b.fromAgentId : '';
      for (const location of new Set([destination, source]))
        if (location) {
          const row = await db
            .prepare(
              "SELECT data_json FROM manager_records WHERE id=? AND kind='agent'",
            )
            .bind(location)
            .first<{ data_json: string }>();
          if (
            !row ||
            (location === destination && !JSON.parse(row.data_json).active)
          )
            throw Error('Seleccione um agente activo para receber stock.');
        }
      const transfer = b.action === 'stock-transfer';
      if (transfer && (quantity < 1 || source === destination))
        throw Error('Seleccione origens diferentes e uma quantidade positiva.');
      const location = transfer ? source : destination;
      const delta = transfer ? -quantity : quantity;
      const statements = [
        db
          .prepare(
            `INSERT OR IGNORE INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id) SELECT ?,?,?,?,?,?,? WHERE COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=? AND agent_id=?),0)+? >= (${reservedSQL}) AND (?=1 OR COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=?),0)+? >= (${allReservedSQL}))`,
          )
          .bind(
            id,
            productId,
            delta,
            reason,
            user.userId,
            now,
            location,
            productId,
            location,
            delta,
            productId,
            location,
            transfer ? 1 : 0,
            productId,
            quantity,
            productId,
          ),
        audit(
          transfer ? 'Transferência de stock' : 'Movimento de stock',
          productId + ': ' + quantity + ' · ' + reason,
        ),
      ];
      if (transfer)
        statements.push(
          db
            .prepare(
              'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
            )
            .bind(
              id + '-received',
              productId,
              quantity,
              reason,
              user.userId,
              now,
              destination,
              eventId,
            ),
        );
      const result = await db.batch(statements);
      if (!result[0].meta.changes)
        return json(
          {
            error:
              'Movimento repetido ou stock disponível insuficiente na origem.',
          },
          409,
        );
      return json({ ok: true });
    }
    if (b.action === 'order') {
      const id = text('orderId', 70),
        version = integer('version', 1, 1000000),
        step = text('step', 30);
      const row = await db
        .prepare(
          'SELECT owner_id,data_json,version FROM sandbox_orders WHERE id=?',
        )
        .bind(id)
        .first<{ owner_id: string; data_json: string; version: number }>();
      if (!row) return json({ error: 'Pedido não encontrado.' }, 404);
      if (row.version !== version)
        return json(
          { error: 'O pedido mudou. Actualize antes de continuar.' },
          409,
        );
      const order = JSON.parse(row.data_json) as SandboxOrder;
      if (step === 'assign') {
        const agent = await db
          .prepare(
            "SELECT data_json FROM manager_records WHERE id=? AND kind='agent'",
          )
          .bind(text('agentId', 70))
          .first<{ data_json: string }>();
        if (!agent || !JSON.parse(agent.data_json).active)
          throw Error('Seleccione um agente activo.');
        b.agent = JSON.parse(agent.data_json).name;
      }
      const next = {
        ...transition(order, step, b),
        ...(step === 'assign' ? { agentId: b.agentId } : {}),
      };
      let guard = '',
        args: (string | number)[] = [];
      if (step === 'pay') {
        guard = ` AND COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=?),0)>(${allReservedSQL})`;
        args = [order.productId, order.productId];
      }
      let moveReserved = false;
      if (step === 'assign' && b.agentId !== order.agentId) {
        const target = String(b.agentId),
          source = order.agentId ?? '';
        const balance = await db
          .prepare(
            `SELECT COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=? AND agent_id=?),0)-(${reservedSQL}) AS available`,
          )
          .bind(order.productId, target, order.productId, target)
          .first<{ available: number }>();
        moveReserved = (balance?.available ?? 0) < 1;
        if (moveReserved) {
          guard = ` AND COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=? AND agent_id=?),0)>=(${reservedSQL}) AND COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=? AND agent_id=?),0)>0`;
          args = [
            order.productId,
            source,
            order.productId,
            source,
            order.productId,
            source,
          ];
        } else {
          guard = ` AND COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=? AND agent_id=?),0)>(${reservedSQL})`;
          args = [order.productId, target, order.productId, target];
        }
      }
      if (step === 'deliver') {
        guard =
          ' AND COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=? AND agent_id=?),0)>0';
        args = [order.productId, order.agentId ?? ''];
      }
      const statements = [
        db
          .prepare(
            'UPDATE sandbox_orders SET data_json=?,version=? WHERE id=? AND version=?' +
              guard,
          )
          .bind(JSON.stringify(next), next.version, id, version, ...args),
        audit('Pedido: ' + step, id),
      ];
      statements.push(
        db
          .prepare(
            'INSERT INTO sandbox_events(id,owner_id,order_id,action,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
          )
          .bind(crypto.randomUUID(), row.owner_id, id, step, now, eventId),
      );
      if (moveReserved) {
        for (const [suffix, quantity, location] of [
          ['out', -1, order.agentId ?? ''],
          ['in', 1, String(b.agentId)],
        ] as const)
          statements.push(
            db
              .prepare(
                'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
              )
              .bind(
                eventId + '-' + suffix,
                order.productId,
                quantity,
                'Atribuição do pedido #' + id,
                user.userId,
                now,
                location,
                eventId,
              ),
          );
      }
      if (step === 'deliver')
        statements.push(
          db
            .prepare(
              'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id) SELECT ?,?,-1,?,?,?,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
            )
            .bind(
              'delivery-' + id,
              order.productId,
              'Entrega #' + id,
              user.userId,
              now,
              order.agentId ?? '',
              eventId,
            ),
        );
      const result = await db.batch(statements);
      if (!result[0].meta.changes)
        return json(
          {
            error:
              'O pedido mudou ou não há stock disponível. Actualize o stock antes de continuar.',
          },
          409,
        );
      return json({ ok: true });
    }
    return json({ error: 'Acção inválida.' }, 422);
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Não foi possível guardar.' },
      422,
    );
  }
}
