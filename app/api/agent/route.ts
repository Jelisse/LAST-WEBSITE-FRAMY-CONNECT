import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import {
  agentOrderView,
  agentTransition,
  reportTypes,
  type AgentReport,
} from '@/lib/agent-workflow';
import type { SandboxOrder } from '@/lib/domain';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.role !== 'agent')
    return json({ error: 'Acesso reservado ao agente.' }, 403);
  try {
    const db = database();
    const [orders, movements, reports, catalog] = await Promise.all([
      db
        .prepare(
          "SELECT data_json,version FROM sandbox_orders WHERE json_extract(data_json,'$.agentId')=? ORDER BY created_at DESC",
        )
        .bind(user.userId)
        .all<{ data_json: string; version: number }>(),
      db
        .prepare(
          'SELECT id,product_id,quantity,reason,created_at FROM stock_movements WHERE agent_id=? ORDER BY created_at DESC',
        )
        .bind(user.userId)
        .all<{
          id: string;
          product_id: string;
          quantity: number;
          reason: string;
          created_at: string;
        }>(),
      db
        .prepare(
          "SELECT id,data_json,version FROM manager_records WHERE kind='agent-report' AND json_extract(data_json,'$.agentId')=? ORDER BY updated_at DESC LIMIT 100",
        )
        .bind(user.userId)
        .all<{ id: string; data_json: string; version: number }>(),
      db
        .prepare(
          "SELECT id,json_extract(data_json,'$.name') AS name FROM product_catalog",
        )
        .all<{ id: string; name: string }>(),
    ]);
    const views = orders.results.map((row) =>
      agentOrderView(
        { ...JSON.parse(row.data_json), version: row.version },
        new URL(request.url).origin,
      ),
    );
    const ids = new Set([
      ...movements.results.map((m) => m.product_id),
      ...views.map((o) => o.productId),
    ]);
    const stock = [...ids].map((id) => {
      const balance = movements.results
        .filter((m) => m.product_id === id)
        .reduce((sum, m) => sum + m.quantity, 0);
      const reserved = views.filter(
        (o) =>
          o.productId === id &&
          ['QUEUED', 'IN_PRODUCTION', 'READY'].includes(o.status),
      ).length;
      return {
        id,
        name:
          catalog.results.find((p) => p.id === id)?.name ||
          views.find((o) => o.productId === id)?.productName ||
          id,
        balance,
        reserved,
        available: balance - reserved,
      };
    });
    return json({
      orders: views,
      stock,
      movements: movements.results.slice(0, 100),
      reports: reports.results.map((r) => ({
        ...JSON.parse(r.data_json),
        id: r.id,
        version: r.version,
      })),
    });
  } catch {
    return json(
      { error: 'Não foi possível carregar as operações. Tente actualizar.' },
      503,
    );
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.role !== 'agent')
    return json({ error: 'Acesso reservado ao agente.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 12000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw) as Record<string, unknown>;
    const db = database(),
      now = new Date().toISOString(),
      eventId = crypto.randomUUID();
    if (b.action === 'report') {
      if (
        typeof b.id !== 'string' ||
        !/^[0-9a-f-]{36}$/.test(b.id) ||
        typeof b.type !== 'string' ||
        !Object.hasOwn(reportTypes, b.type)
      )
        throw Error('Tipo de relatório inválido.');
      if (
        typeof b.message !== 'string' ||
        b.message.trim().length < 5 ||
        b.message.length > 3000
      )
        throw Error('Descreva o relatório (5–3000 caracteres).');
      const orderId = typeof b.orderId === 'string' ? b.orderId : '';
      const productId = typeof b.productId === 'string' ? b.productId : '';
      if (
        orderId &&
        !(await db
          .prepare(
            "SELECT id FROM sandbox_orders WHERE id=? AND json_extract(data_json,'$.agentId')=?",
          )
          .bind(orderId, user.userId)
          .first())
      )
        return json({ error: 'Pedido não atribuído a esta conta.' }, 403);
      const stockReport = [
        'low_stock',
        'damage',
        'stock_count',
        'receipt',
      ].includes(b.type);
      if (
        stockReport &&
        (!productId ||
          !(await db
            .prepare(
              'SELECT id FROM stock_movements WHERE product_id=? AND agent_id=? LIMIT 1',
            )
            .bind(productId, user.userId)
            .first()))
      )
        throw Error('Seleccione um produto do stock atribuído.');
      if (
        stockReport &&
        (!Number.isSafeInteger(b.quantity) ||
          Number(b.quantity) < 0 ||
          Number(b.quantity) > 100000)
      )
        throw Error('Quantidade inválida.');
      const report: AgentReport = {
        id: b.id,
        agentId: user.userId,
        agentName: user.displayName,
        type: b.type as AgentReport['type'],
        message: b.message.trim(),
        orderId,
        productId: stockReport ? productId : '',
        ...(stockReport ? { quantity: Number(b.quantity) } : {}),
        status: 'open',
        createdAt: now,
        version: 1,
      };
      if (b.type === 'daily' || b.type === 'weekly') {
        const since = new Date(
          Date.now() - (b.type === 'daily' ? 1 : 7) * 86400000,
        ).toISOString();
        const counts = await db
          .prepare(
            "SELECT json_extract(data_json,'$.status') AS status,COUNT(*) AS total FROM sandbox_orders WHERE json_extract(data_json,'$.agentId')=? AND json_extract(data_json,'$.updatedAt')>=? GROUP BY json_extract(data_json,'$.status')",
          )
          .bind(user.userId, since)
          .all<{ status: string; total: number }>();
        report.summary = Object.fromEntries(
          counts.results.map((r) => [r.status, r.total]),
        );
      }
      const result = await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO manager_records(id,kind,data_json,version,updated_at) VALUES(?,'agent-report',?,1,?)",
          )
          .bind(b.id, JSON.stringify(report), now),
        db
          .prepare(
            'INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0',
          )
          .bind(eventId, user.userId, 'Relatório do agente', b.id, now),
      ]);
      if (!result[0].meta.changes)
        return json(
          { error: 'Relatório já enviado. Actualize para consultar.' },
          409,
        );
      return json({ ok: true });
    }
    if (
      b.action !== 'order' ||
      typeof b.orderId !== 'string' ||
      typeof b.step !== 'string' ||
      !Number.isSafeInteger(b.version)
    )
      throw Error('Acção inválida.');
    const row = await db
      .prepare(
        "SELECT owner_id,data_json,version FROM sandbox_orders WHERE id=? AND json_extract(data_json,'$.agentId')=?",
      )
      .bind(b.orderId, user.userId)
      .first<{ owner_id: string; data_json: string; version: number }>();
    if (!row) return json({ error: 'Pedido não encontrado.' }, 404);
    if (row.version !== b.version)
      return json(
        { error: 'O pedido mudou. Actualize antes de continuar.' },
        409,
      );
    const order = {
      ...JSON.parse(row.data_json),
      version: row.version,
    } as SandboxOrder;
    const next = agentTransition(
      order,
      user.userId,
      b.step,
      b,
      new URL(request.url).origin,
    );
    const guard =
      b.step === 'deliver'
        ? ' AND COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=? AND agent_id=?),0)>0'
        : '';
    const args = b.step === 'deliver' ? [order.productId, user.userId] : [];
    const statements = [
      db
        .prepare(
          "UPDATE sandbox_orders SET data_json=?,version=? WHERE id=? AND version=? AND json_extract(data_json,'$.agentId')=?" +
            guard,
        )
        .bind(
          JSON.stringify(next),
          next.version,
          order.id,
          row.version,
          user.userId,
          ...args,
        ),
      db
        .prepare('INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0')
        .bind(eventId, user.userId, 'Agente: ' + b.step, order.id, now),
      db
        .prepare(
          'INSERT INTO sandbox_events SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
        )
        .bind(
          crypto.randomUUID(),
          row.owner_id,
          order.id,
          b.step,
          now,
          eventId,
        ),
    ];
    if (b.step === 'deliver')
      statements.push(
        db
          .prepare(
            'INSERT INTO stock_movements(id,product_id,quantity,reason,actor,created_at,agent_id) SELECT ?,?,-1,?,?,?,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
          )
          .bind(
            'delivery-' + order.id,
            order.productId,
            'Entrega #' + order.id,
            user.userId,
            now,
            user.userId,
            eventId,
          ),
      );
    const result = await db.batch(statements);
    if (!result[0].meta.changes)
      return json(
        {
          error:
            'Pedido alterado ou stock insuficiente. Actualize e contacte Operações.',
        },
        409,
      );
    return json({ ok: true });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Não foi possível guardar.' },
      422,
    );
  }
}
