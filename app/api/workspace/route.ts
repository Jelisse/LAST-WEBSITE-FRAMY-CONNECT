import { POST as manageOrder } from '@/app/api/manager/route';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { env } from 'cloudflare:workers';
import { database } from '@/lib/server-db';
import {
  publicProfile,
  validateProfile,
  type SandboxOrder,
  validatePlanContent,
} from '@/lib/domain';
import { publicProduct } from '@/lib/catalog';
import { getProducts, canManageCatalog } from '@/lib/server-catalog';
import { getManagedPlans, membershipTerms } from '@/lib/server-plans';
import { canManageOrders } from '@/lib/server-order-access';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão para continuar.' }, 401);
  try {
    const db = database();
    const [p, orders, events, membership] = await Promise.all([
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
          'SELECT id, order_id AS orderId, action, created_at AS createdAt FROM sandbox_events WHERE owner_id = ? ORDER BY created_at DESC',
        )
        .bind(user.userId)
        .all(),
      db
        .prepare(
          'SELECT plan_id,version,terms_json FROM sandbox_memberships WHERE owner_id=?',
        )
        .bind(user.userId)
        .first<{
          plan_id: string;
          version: number;
          terms_json: string | null;
        }>(),
    ]);
    return json({
      products: (await getProducts()).map(publicProduct),
      canManageProducts: await canManageCatalog(user.userId),
      canManageOrders: await canManageOrders(user.userId),
      profile: p ? JSON.parse(p.draft_json) : null,
      published: !!p?.published_json,
      publishedUsername: p?.published_json
        ? JSON.parse(p.published_json).username
        : null,
      profileVersion: p?.version ?? 0,
      plans: (await getManagedPlans()).filter((p) => p.active),
      membership: {
        terms: membershipTerms(membership),
        planId: membership?.plan_id ?? 'individual',
        version: membership?.version ?? 0,
        mode: 'sandbox',
      },
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
  if (Number(request.headers.get('content-length')) > 64000)
    return json({ error: 'Pedido demasiado grande.' }, 413);
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 64000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error();
  } catch {
    return json({ error: 'Pedido inválido.' }, 422);
  }
  try {
    const db = database(),
      now = new Date().toISOString();
    if (body.action === 'activate-sandbox-plan') {
      if (!Number.isInteger(body.version) || Number(body.version) < 0)
        return json({ error: 'Versão inválida.' }, 422);
      const plan = (await getManagedPlans()).find(
        (p) => p.id === body.planId && p.active,
      );
      if (!plan) return json({ error: 'Plano indisponível.' }, 422);
      if (body.planVersion !== plan.version)
        return json(
          {
            error: 'As condições do plano mudaram. Actualize antes de aderir.',
          },
          409,
        );
      const p = await db
        .prepare(
          'SELECT draft_json,published_json,version FROM profiles WHERE owner_id=?',
        )
        .bind(user.userId)
        .first<{
          draft_json: string;
          published_json: string | null;
          version: number;
        }>();
      // A downgrade must never discard saved or published content.
      if (p) validatePlanContent(JSON.parse(p.draft_json), plan);
      if (p?.published_json)
        validatePlanContent(JSON.parse(p.published_json), plan);
      const result = await db
        .prepare(`INSERT INTO sandbox_memberships (owner_id,plan_id,version,updated_at,terms_json)
        SELECT ?,?,1,?,? WHERE COALESCE((SELECT version FROM sandbox_memberships WHERE owner_id=?),0)=?
        AND COALESCE((SELECT version FROM profiles WHERE owner_id=?),0)=?
        ON CONFLICT(owner_id) DO UPDATE SET plan_id=excluded.plan_id,version=sandbox_memberships.version+1,updated_at=excluded.updated_at,terms_json=excluded.terms_json`)
        .bind(
          user.userId,
          plan.id,
          now,
          JSON.stringify(plan),
          user.userId,
          body.version,
          user.userId,
          p?.version ?? 0,
        )
        .run();
      if (!result.meta.changes)
        return json(
          { error: 'O plano ou perfil mudou. Actualize antes de continuar.' },
          409,
        );
      return json({ ok: true, simulation: true });
    }
    if (
      body.action === 'save-profile' ||
      body.action === 'publish-profile' ||
      body.action === 'unpublish-profile'
    ) {
      if (!Number.isInteger(body.version) || Number(body.version) < 0)
        return json({ error: 'Versão inválida.' }, 422);
      const profile = validateProfile(body.profile);
      if (profile.photoUrl && body.action !== 'unpublish-profile') {
        const photo = await env.PROFILE_PHOTOS?.head(
          `profiles/${profile.photoUrl.split('/').pop()}`,
        );
        if (!photo || photo.customMetadata?.ownerId !== user.userId)
          return json(
            { error: 'Carregue a sua própria fotografia antes de guardar.' },
            422,
          );
      }
      const membership = await db
        .prepare(
          'SELECT plan_id,version,terms_json FROM sandbox_memberships WHERE owner_id=?',
        )
        .bind(user.userId)
        .first<{
          plan_id: string;
          version: number;
          terms_json: string | null;
        }>();
      validatePlanContent(profile, membershipTerms(membership));
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
            'INSERT OR IGNORE INTO profiles (owner_id,username,draft_json,published_json,version,updated_at) SELECT ?,?,?,?,1,? WHERE COALESCE((SELECT version FROM sandbox_memberships WHERE owner_id=?),0)=?',
          )
          .bind(
            user.userId,
            profile.username,
            JSON.stringify(profile),
            published,
            now,
            user.userId,
            membership?.version ?? 0,
          )
          .run();
      } else {
        const expr = body.action === 'save-profile' ? 'published_json' : '?';
        const q = db.prepare(
          `UPDATE profiles SET draft_json=?, published_json=${expr},version=version+1,updated_at=? WHERE owner_id=? AND version=? AND COALESCE((SELECT version FROM sandbox_memberships WHERE owner_id=?),0)=?`,
        );
        result =
          body.action === 'save-profile'
            ? await q
                .bind(
                  JSON.stringify(profile),
                  now,
                  user.userId,
                  body.version,
                  user.userId,
                  membership?.version ?? 0,
                )
                .run()
            : await q
                .bind(
                  JSON.stringify(profile),
                  published,
                  now,
                  user.userId,
                  body.version,
                  user.userId,
                  membership?.version ?? 0,
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
    if (
      request.headers.get('x-framy-order-management') !== 'true' ||
      !(await canManageOrders(user.userId))
    ) {
      return json(
        {
          error:
            'O acompanhamento do pedido é apenas de consulta. Apenas a equipa autorizada pode alterar pedidos.',
        },
        403,
      );
    }
    if (body.action === 'create-order') {
      if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id))
        return json({ error: 'Referência inválida.' }, 422);
      const product = (await getProducts()).find(
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
    let agentId = body.agentId;
    if (
      body.action === 'assign' &&
      !agentId &&
      typeof body.agent === 'string'
    ) {
      const agent = await db
        .prepare(
          "SELECT id FROM manager_records WHERE kind='agent' AND json_extract(data_json,'$.name')=? AND json_extract(data_json,'$.active')=1",
        )
        .bind(body.agent.trim())
        .first<{ id: string }>();
      agentId = agent?.id;
    }
    return manageOrder(
      new Request(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({
          ...body,
          action: 'order',
          step: body.action,
          agentId,
        }),
      }),
    );
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
