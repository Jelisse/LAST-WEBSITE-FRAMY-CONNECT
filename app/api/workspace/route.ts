import { customerOrder } from '@/lib/customer-order';
import { serviceFailure } from '@/lib/service-failure';
import { hasActiveTrial } from '@/lib/entitlement';
import {
  expireReservations,
  RESERVATION_MS,
  MAX_PENDING_ORDERS,
} from '@/lib/server-reservations';
import { tokenHash } from '@/lib/server-auth';
import {
  FREE_PLAN_ID,
  validateDesign,
  supportsDesign,
} from '@/lib/customisation';
import { validateDelivery, canEditDelivery } from '@/lib/delivery';
import { POST as manageOrder } from '@/app/api/manager/route';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { env } from 'cloudflare:workers';
import { database } from '@/lib/server-db';
import {
  publicProfile,
  usernameFromName,
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
  try {
    const user = await getChatGPTUser();
    if (!user) return json({ error: 'Inicie sessão para continuar.' }, 401);
    await expireReservations();
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
          'SELECT plan_id,version,terms_json,trial_started_at,trial_expires_at FROM sandbox_memberships WHERE owner_id=?',
        )
        .bind(user.userId)
        .first<{
          plan_id: string;
          version: number;
          terms_json: string | null;
          trial_started_at: string | null;
          trial_expires_at: string | null;
        }>(),
    ]);
    const customerOrders = await Promise.all(orders.results.map(async (row) => {
      const order = JSON.parse(row.data_json) as SandboxOrder;
      let contact;
      if (order.agentId && order.paid && order.status !== 'CANCELLED') {
        const record = await db.prepare("SELECT data_json FROM manager_records WHERE id=? AND kind='agent'")
          .bind(order.agentId).first<{ data_json: string }>();
        if (record) {
          const agent = JSON.parse(record.data_json);
          if (agent.active) contact = { name: String(agent.name || order.agent), phone: String(agent.phone || '') };
        }
      }
      return customerOrder(order, contact);
    }));
    return json({
      products: (await getProducts())
        .filter((p) => p.published !== false)
        .map(publicProduct),
      canManageProducts: await canManageCatalog(user.userId),
      canManageOrders: await canManageOrders(user.userId),
      profile: p ? JSON.parse(p.draft_json) : null,
      published: !!p?.published_json && hasActiveTrial(membership),
      publishedUsername:
        p?.published_json && hasActiveTrial(membership)
          ? JSON.parse(p.published_json).username
          : null,
      profileVersion: p?.version ?? 0,
      plans: (await getManagedPlans()).filter((p) => p.active),
      membership: {
        terms: membershipTerms(membership),
        planId: membership?.plan_id ?? '',
        version: membership?.version ?? 0,
        mode: 'trial',
        active: hasActiveTrial(membership),
        expiresAt: membership?.trial_expires_at ?? null,
      },
      orders: customerOrders,
      events: events.results,
    });
  } catch (error) {
    return serviceFailure(error, 'workspace', 'Não foi possível carregar os dados. Tente novamente.');
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
    if (body.action === 'update-delivery') {
      if (
        typeof body.orderId !== 'string' ||
        !Number.isSafeInteger(body.version)
      )
        return json({ error: 'Pedido inválido.' }, 422);
      const delivery = validateDelivery(body);
      const row = await db
        .prepare(
          'SELECT data_json,version FROM sandbox_orders WHERE id=? AND owner_id=?',
        )
        .bind(body.orderId, user.userId)
        .first<{ data_json: string; version: number }>();
      if (!row) return json({ error: 'Pedido não encontrado.' }, 404);
      if (row.version !== body.version)
        return json(
          { error: 'O pedido mudou. Actualize antes de guardar.' },
          409,
        );
      const order = JSON.parse(row.data_json) as SandboxOrder;
      if (!canEditDelivery(order))
        return json(
          {
            error:
              'A entrega já está em tratamento. Contacte a equipa para alterar o local.',
          },
          409,
        );
      const next = {
        ...order,
        ...delivery,
        version: order.version + 1,
        updatedAt: now,
      };
      const eventId = crypto.randomUUID();
      const result = await db.batch([
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
            'INSERT INTO sandbox_events(id,owner_id,order_id,action,created_at) SELECT ?,?,?,?,? WHERE changes()>0',
          )
          .bind(eventId, user.userId, body.orderId, 'delivery-address', now),
        db
          .prepare(
            'INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sandbox_events WHERE id=?)',
          )
          .bind(
            crypto.randomUUID(),
            user.userId,
            'Local de entrega indicado',
            body.orderId + ' · ' + delivery.deliveryCity,
            now,
            eventId,
          ),
      ]);
      if (!result[0].meta.changes)
        return json(
          { error: 'O pedido mudou. Actualize antes de guardar.' },
          409,
        );
      return json({ ok: true });
    }
    if (body.action === 'activate-sandbox-plan') {
      if (body.planId !== FREE_PLAN_ID)
        return json(
          { error: 'Apenas o plano de 30 dias grátis está disponível.' },
          422,
        );
      const trial = await db
        .prepare(
          'SELECT trial_started_at,trial_expires_at FROM sandbox_memberships WHERE owner_id=?',
        )
        .bind(user.userId)
        .first<{
          trial_started_at: string | null;
          trial_expires_at: string | null;
        }>();
      if (trial?.trial_expires_at && trial.trial_expires_at <= now)
        return json(
          {
            error:
              'O período gratuito terminou. Contacte a equipa para continuar.',
          },
          422,
        );
      const trialStart = trial?.trial_started_at ?? now;
      const trialEnd =
        trial?.trial_expires_at ??
        new Date(Date.parse(trialStart) + 30 * 86400000).toISOString();
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
        .prepare(`INSERT INTO sandbox_memberships (owner_id,plan_id,version,updated_at,terms_json,trial_started_at,trial_expires_at)
        SELECT ?,?,1,?,?,?,? WHERE COALESCE((SELECT version FROM sandbox_memberships WHERE owner_id=?),0)=?
        AND COALESCE((SELECT version FROM profiles WHERE owner_id=?),0)=?
        ON CONFLICT(owner_id) DO UPDATE SET plan_id=excluded.plan_id,version=sandbox_memberships.version+1,updated_at=excluded.updated_at,terms_json=excluded.terms_json,trial_started_at=excluded.trial_started_at,trial_expires_at=excluded.trial_expires_at`)
        .bind(
          user.userId,
          plan.id,
          now,
          JSON.stringify(plan),
          trialStart,
          trialEnd,
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
      let profileInput = body.profile;
      if (
        body.version === 0 &&
        profileInput &&
        typeof profileInput === 'object' &&
        !Array.isArray(profileInput)
      ) {
        const input = profileInput as Record<string, unknown>;
        if (
          (body.autoUsername === true || !input.username) &&
          typeof input.name === 'string'
        ) {
          const base = usernameFromName(input.name);
          let candidate = base;
          for (
            let i = 1;
            base &&
            (await db
              .prepare('SELECT owner_id FROM profiles WHERE username=?')
              .bind(candidate)
              .first());
            i++
          ) {
            candidate =
              base.slice(0, 30) +
              '_' +
              (i < 20 ? i + 1 : crypto.randomUUID().slice(0, 8));
          }
          profileInput = { ...input, username: candidate };
        }
      }
      if (body.action === 'publish-profile') {
        const trial = await db
          .prepare(
            'SELECT plan_id,trial_started_at,trial_expires_at FROM sandbox_memberships WHERE owner_id=?',
          )
          .bind(user.userId)
          .first<import('@/lib/entitlement').Membership>();
        if (!hasActiveTrial(trial))
          return json(
            {
              error:
                'Active os 30 dias gratuitos antes de publicar. Se o período terminou, contacte a equipa.',
            },
            403,
          );
      }
      const profile = validateProfile(profileInput);
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
          'SELECT plan_id,version,terms_json,trial_started_at,trial_expires_at FROM sandbox_memberships WHERE owner_id=?',
        )
        .bind(user.userId)
        .first<{
          plan_id: string;
          version: number;
          terms_json: string | null;
          trial_started_at: string | null;
          trial_expires_at: string | null;
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
      body.action !== 'submit-order' &&
      (request.headers.get('x-framy-order-management') !== 'true' ||
        !(await canManageOrders(user.userId)))
    ) {
      return json(
        {
          error:
            'O acompanhamento do pedido é apenas de consulta. Apenas a equipa autorizada pode alterar pedidos.',
        },
        403,
      );
    }
    if (body.action === 'create-order' || body.action === 'submit-order') {
      if (body.checkout !== true || body.approveProfile !== true)
        return json(
          { error: 'Confirme o perfil e utilize o percurso de compra.' },
          422,
        );
      await expireReservations();
      const delivery = validateDelivery(body);
      if (typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/.test(body.id))
        return json({ error: 'Referência inválida.' }, 422);
      const product = (await getProducts()).find(
        (p) => p.id === body.productId && p.available && p.published !== false,
      );
      if (!product)
        return json(
          { error: 'Este produto está disponível apenas sob consulta.' },
          422,
        );
      const fingerprint = await tokenHash(
        JSON.stringify({
          productId: body.productId,
          planId: body.planId,
          design: body.design ?? null,
          delivery,
          contact: body.deliveryContact,
        }),
      );
      const existing = await db
        .prepare('SELECT owner_id,data_json FROM sandbox_orders WHERE id=?')
        .bind(body.id)
        .first<{ owner_id: string; data_json: string }>();
      if (existing) {
        const previous = JSON.parse(existing.data_json) as SandboxOrder;
        if (
          existing.owner_id !== user.userId ||
          previous.checkoutFingerprint !== fingerprint
        )
          return json(
            {
              error:
                'Esta referência pertence a outro pedido. Inicie uma nova encomenda.',
            },
            409,
          );
        return json({ ok: true, id: body.id, order: customerOrder(previous) });
      }
      const rateKey = await tokenHash(
        'checkout-ip:' + (request.headers.get('cf-connecting-ip') ?? 'local'),
      );
      const rateNow = Date.now();
      const rate = await db
        .prepare(
          'INSERT INTO auth_attempts(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN excluded.expires_at ELSE expires_at END RETURNING count',
        )
        .bind(rateKey, rateNow + 3600000, rateNow, rateNow)
        .first<{ count: number }>();
      if ((rate?.count ?? 99) > 20)
        return json(
          {
            error:
              'Demasiados pedidos nesta ligação. Aguarde uma hora ou contacte a equipa.',
          },
          429,
        );
      let membershipVersion = 0;
      let checkout: Partial<SandboxOrder> = {};
      if (body.checkout === true) {
        const profileRow = await db
          .prepare(
            'SELECT username,draft_json,published_json,version FROM profiles WHERE owner_id=?',
          )
          .bind(user.userId)
          .first<{
            username: string;
            draft_json: string;
            published_json: string | null;
            version: number;
          }>();
        const member = await db
          .prepare(
            'SELECT plan_id,version,terms_json,trial_started_at,trial_expires_at FROM sandbox_memberships WHERE owner_id=?',
          )
          .bind(user.userId)
          .first<{
            plan_id: string;
            version: number;
            terms_json: string | null;
            trial_started_at: string | null;
            trial_expires_at: string | null;
          }>();
        if (!hasActiveTrial(member))
          return json(
            { error: 'Active um período gratuito válido antes de confirmar.' },
            403,
          );
        membershipVersion = member!.version;
        const terms = membershipTerms(member);
        const currentPlan = (await getManagedPlans()).find(
          (p) => p.id === FREE_PLAN_ID && p.id === body.planId && p.active,
        );
        if (
          !profileRow?.draft_json ||
          profileRow.version !== body.profileVersion
        )
          return json(
            {
              error: 'Guarde e aprove o perfil antes de confirmar o pedido.',
            },
            409,
          );
        if (
          !member ||
          !currentPlan ||
          member.plan_id !== body.planId ||
          currentPlan.version !== body.planVersion ||
          terms.version !== body.planVersion
        )
          return json(
            {
              error:
                'As condições do plano mudaram. Reveja a escolha antes de confirmar.',
            },
            409,
          );
        if (
          typeof body.deliveryContact !== 'string' ||
          body.deliveryContact.trim().length < 6 ||
          body.deliveryContact.length > 40 ||
          Array.from(body.deliveryContact).some((c) => c.charCodeAt(0) < 32)
        )
          return json({ error: 'Indique um contacto de entrega válido.' }, 422);
        checkout = {
          checkoutPlan: terms,
          profileUsername: profileRow.username,
          approvedProfileVersion: profileRow.version + 1,
          approvedProfileSnapshot: publicProfile(
            validateProfile(JSON.parse(profileRow.draft_json)),
          ),
          deliveryContact: body.deliveryContact.trim(),
        };
      }
      const inventory = await db
        .prepare(
          "SELECT COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=?),0)-(SELECT COUNT(*) FROM sandbox_orders WHERE json_extract(data_json,'$.productId')=? AND json_extract(data_json,'$.status') IN ('PENDING_PAYMENT','QUEUED','IN_PRODUCTION','READY')) AS available",
        )
        .bind(product.id, product.id)
        .first<{ available: number }>();
      if ((inventory?.available ?? 0) < 1)
        return json(
          {
            error:
              'Sem stock físico disponível para reserva. Contacte a equipa.',
          },
          409,
        );
      const design = validateDesign(body.design, product);
      if (supportsDesign(product) && !body.checkout)
        return json(
          {
            error:
              'Utilize o percurso de compra para escolher o modelo e aprovar o design.',
          },
          422,
        );
      if (design) {
        const stock = await db
          .prepare('SELECT quantity,enabled FROM product_options WHERE id=?')
          .bind(design.optionId)
          .first<{ quantity: number; enabled: number }>();
        if (!stock?.enabled || stock.quantity < 1)
          return json(
            {
              error:
                'O modelo está sem stock ou foi desactivado. Escolha outro.',
            },
            409,
          );
        for (const side of ['front', 'back'] as const) {
          const a = design[side];
          if (!a) continue;
          const asset = await env.PROFILE_PHOTOS?.head(`designs/${a.assetId}`);
          if (!asset || asset.customMetadata?.ownerId !== user.userId)
            return json(
              { error: 'Carregue o seu próprio ficheiro de design.' },
              422,
            );
        }
        if (product.category === 'Cartões') {
          const row = await db
            .prepare('SELECT draft_json FROM profiles WHERE owner_id=?')
            .bind(user.userId)
            .first<{ draft_json: string }>();
          const p = row ? JSON.parse(row.draft_json) : null;
          if (!p?.email || !p?.name)
            return json(
              {
                error: 'Nome e email são obrigatórios para imprimir o cartão.',
              },
              422,
            );
          design.holderName = p.name;
          design.holderEmail = p.email;
          design.profileUrl = new URL(
            '/' + checkout.profileUsername,
            request.url,
          ).href;
        }
      }
      const o: SandboxOrder = {
        design,
        checkoutFingerprint: fingerprint,
        reservationExpiresAt: new Date(
          Date.now() + RESERVATION_MS,
        ).toISOString(),
        ...checkout,
        ...delivery,
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
      const createdEvent = crypto.randomUUID();
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO sandbox_orders (id,owner_id,data_json,version,created_at) SELECT ?,?,?,1,? WHERE (? IS NULL OR EXISTS(SELECT 1 FROM product_options WHERE id=? AND quantity>0 AND enabled=1)) AND (SELECT COUNT(*) FROM sandbox_orders WHERE owner_id=? AND json_extract(data_json,'$.status')='PENDING_PAYMENT')<? AND EXISTS(SELECT 1 FROM profiles WHERE owner_id=? AND version=?) AND EXISTS(SELECT 1 FROM sandbox_memberships WHERE owner_id=? AND plan_id='free-30' AND trial_started_at<=? AND trial_expires_at>? AND version=?) AND COALESCE((SELECT version FROM manager_records WHERE id=? AND kind='plan'),0)=? AND COALESCE((SELECT version FROM product_catalog WHERE id=?),0)=? AND COALESCE((SELECT SUM(quantity) FROM stock_movements WHERE product_id=?),0)>(SELECT COUNT(*) FROM sandbox_orders WHERE json_extract(data_json,'$.productId')=? AND json_extract(data_json,'$.status') IN ('PENDING_PAYMENT','QUEUED','IN_PRODUCTION','READY'))",
          )
          .bind(
            o.id,
            user.userId,
            JSON.stringify(o),
            now,
            design?.optionId ?? null,
            design?.optionId ?? null,
            user.userId,
            MAX_PENDING_ORDERS,
            user.userId,
            body.profileVersion,
            user.userId,
            now,
            now,
            membershipVersion,
            body.planId,
            body.planVersion,
            product.id,
            product.version,
            product.id,
            product.id,
          ),
        ...(design
          ? [
              db
                .prepare(
                  'UPDATE product_options SET quantity=quantity-1,version=version+1 WHERE id=? AND changes()=1',
                )
                .bind(design.optionId),
            ]
          : []),
        db
          .prepare(
            'INSERT INTO sandbox_events (id,owner_id,order_id,action,created_at) SELECT ?,?,?,?,? WHERE changes()=1',
          )
          .bind(createdEvent, user.userId, o.id, 'created', now),
        db
          .prepare(
            'UPDATE profiles SET published_json=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM sandbox_events WHERE id=?)',
          )
          .bind(
            JSON.stringify(o.approvedProfileSnapshot),
            now,
            user.userId,
            body.profileVersion,
            createdEvent,
          ),
      ]);
      const saved = await db
        .prepare('SELECT id FROM sandbox_orders WHERE id=? AND owner_id=?')
        .bind(o.id, user.userId)
        .first();
      if (!saved) return json({ error: 'Referência indisponível.' }, 409);
      return json({ ok: true, id: o.id, order: customerOrder(o) });
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
