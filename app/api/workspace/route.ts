import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import {
  publicProfile,
  validateProfile,
  transition,
  type SandboxOrder,
} from '@/lib/domain';
import { products } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão para continuar.' }, 401);
  try {
    const db = database();
    const [p, orders, events] = await Promise.all([
      db
        .prepare('SELECT * FROM profiles WHERE owner_id = ?')
        .bind(user.userId)
        .first<{
          draft_json: string;
          published_json: string | null;
          version: number;
        }>(),
      db
        .prepare(
          'SELECT data_json FROM sandbox_orders WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100',
        )
        .bind(user.userId)
        .all<{ data_json: string }>(),
      db
        .prepare(
          'SELECT id, order_id AS orderId, action, created_at AS createdAt FROM sandbox_events WHERE owner_id = ? ORDER BY created_at DESC LIMIT 100',
        )
        .bind(user.userId)
        .all(),
    ]);
    return json({
      profile: p ? JSON.parse(p.draft_json) : null,
      published: !!p?.published_json,
      publishedUsername: p?.published_json
        ? JSON.parse(p.published_json).username
        : null,
      profileVersion: p?.version ?? 0,
      orders: orders.results.map((o) => JSON.parse(o.data_json)),
      events: events.results,
    });
  } catch {
    return json(
      { error: 'Não foi possível carregar os dados. Tente novamente.' },
      503,
    );
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão para continuar.' }, 401);
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  if (Number(request.headers.get('content-length')) > 12000)
    return json({ error: 'Pedido demasiado grande.' }, 413);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
  } catch {
    return json({ error: 'Pedido inválido.' }, 422);
  }
  try {
    const db = database(),
      now = new Date().toISOString();
    if (
      body.action === 'save-profile' ||
      body.action === 'publish-profile' ||
      body.action === 'unpublish-profile'
    ) {
      if (!Number.isInteger(body.version) || Number(body.version) < 0)
        return json({ error: 'Versão inválida.' }, 422);
      const profile = validateProfile(body.profile);
      const published =
        body.action === 'publish-profile'
          ? JSON.stringify(publicProfile(profile))
          : null;
      const current = await db
        .prepare('SELECT username FROM profiles WHERE owner_id = ?')
        .bind(user.userId)
        .first<{ username: string }>();
      if (current && current.username !== profile.username)
        return json(
          {
            error:
              'O nome de utilizador fica reservado após a primeira gravação.',
          },
          422,
        );
      let result;
      if (body.version === 0) {
        result = await db
          .prepare(
            'INSERT OR IGNORE INTO profiles (owner_id,username,draft_json,published_json,version,updated_at) VALUES (?,?,?,?,1,?)',
          )
          .bind(
            user.userId,
            profile.username,
            JSON.stringify(profile),
            published,
            now,
          )
          .run();
      } else {
        const expr = body.action === 'save-profile' ? 'published_json' : '?';
        const q = db.prepare(
          `UPDATE profiles SET draft_json=?, published_json=${expr},version=version+1,updated_at=? WHERE owner_id=? AND version=?`,
        );
        result =
          body.action === 'save-profile'
            ? await q
                .bind(JSON.stringify(profile), now, user.userId, body.version)
                .run()
            : await q
                .bind(
                  JSON.stringify(profile),
                  published,
                  now,
                  user.userId,
                  body.version,
                )
                .run();
      }
      if (!result.meta.changes)
        return json(
          {
            error:
              'O nome já está reservado ou os dados mudaram. Actualize antes de tentar novamente.',
          },
          409,
        );
      return json({ ok: true });
    }
    if (body.action === 'create-order') {
      if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id))
        return json({ error: 'Referência inválida.' }, 422);
      const product = products.find(
        (p) => p.id === body.productId && p.available,
      );
      if (!product)
        return json(
          { error: 'Este produto está disponível apenas sob consulta.' },
          422,
        );
      const existing = await db
        .prepare('SELECT owner_id,data_json FROM sandbox_orders WHERE id=?')
        .bind(body.id)
        .first<{ owner_id: string; data_json: string }>();
      if (existing) {
        if (
          existing.owner_id !== user.userId ||
          JSON.parse(existing.data_json).productId !== body.productId
        )
          return json(
            {
              error:
                'Esta referência pertence a outro pedido. Use uma nova referência.',
            },
            409,
          );
        return json({ ok: true, id: body.id });
      }
      const count = await db
        .prepare('SELECT COUNT(*) AS n FROM sandbox_orders WHERE owner_id=?')
        .bind(user.userId)
        .first<{ n: number }>();
      if ((count?.n ?? 0) >= 100)
        return json({ error: 'Limite de 100 pedidos de teste atingido.' }, 422);
      const o: SandboxOrder = {
        id: body.id,
        productId: product.id,
        productName: product.name,
        amount: product.amount,
        cost: product.cost,
        status: 'PENDING_PAYMENT',
        paid: false,
        refunded: false,
        qc: false,
        agent: '',
        proof: '',
        version: 1,
        createdAt: now,
        updatedAt: now,
        journal: [],
      };
      await db.batch([
        db
          .prepare(
            'INSERT OR IGNORE INTO sandbox_orders (id,owner_id,data_json,version,created_at) VALUES (?,?,?,1,?)',
          )
          .bind(o.id, user.userId, JSON.stringify(o), now),
        db
          .prepare(
            'INSERT INTO sandbox_events (id,owner_id,order_id,action,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
          )
          .bind(crypto.randomUUID(), user.userId, o.id, 'created', now),
      ]);
      const saved = await db
        .prepare('SELECT id FROM sandbox_orders WHERE id=? AND owner_id=?')
        .bind(o.id, user.userId)
        .first();
      if (!saved) return json({ error: 'Referência indisponível.' }, 409);
      return json({ ok: true, id: o.id });
    }
    if (
      typeof body.orderId !== 'string' ||
      !Number.isInteger(body.version) ||
      typeof body.action !== 'string'
    )
      return json({ error: 'Acção inválida.' }, 422);
    const record = await db
      .prepare(
        'SELECT data_json,version FROM sandbox_orders WHERE id=? AND owner_id=?',
      )
      .bind(body.orderId, user.userId)
      .first<{ data_json: string; version: number }>();
    if (!record) return json({ error: 'Pedido não encontrado.' }, 404);
    if (record.version !== body.version)
      return json(
        { error: 'Este pedido mudou. Actualize antes de continuar.' },
        409,
      );
    const next = transition(JSON.parse(record.data_json), body.action, body);
    const results = await db.batch([
      db
        .prepare(
          'UPDATE sandbox_orders SET data_json=?,version=? WHERE id=? AND owner_id=? AND version=?',
        )
        .bind(
          JSON.stringify(next),
          next.version,
          body.orderId,
          user.userId,
          body.version,
        ),
      db
        .prepare(
          'INSERT INTO sandbox_events (id,owner_id,order_id,action,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
        )
        .bind(crypto.randomUUID(), user.userId, body.orderId, body.action, now),
    ]);
    if (!results[0].meta.changes)
      return json(
        { error: 'Este pedido mudou. Actualize antes de continuar.' },
        409,
      );
    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/D1|SQLITE|database|constraint/i.test(message))
      return json(
        {
          error:
            'Não foi possível guardar. Actualize os dados e tente novamente.',
        },
        409,
      );
    return json(
      { error: message || 'Não foi possível completar a acção.' },
      422,
    );
  }
}
