import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { ambassadorPrefix, normalizeAmbassadorCode } from '@/lib/ambassador';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get('code');
    const db = database();
    if (code !== null) {
      if (!(await rateLimit(request, 'ambassador-code', 60)))
        return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
      const row = await db
        .prepare(
          'SELECT b.code FROM ambassadors b JOIN auth_accounts a ON a.id=b.account_id AND a.active=1 WHERE b.code=? AND b.active=1',
        )
        .bind(normalizeAmbassadorCode(code))
        .first();
      return json({
        valid: !!row,
        code: row?.code ?? null,
        discountPercent: 10,
      });
    }
    const user = await getChatGPTUser();
    if (!user) return json({ error: 'Inicie sessão.' }, 401);
    const manager = user.role === 'manager';
    const members = await db
      .prepare(
        `SELECT b.*,a.name FROM ambassadors b JOIN auth_accounts a ON a.id=b.account_id ${manager ? '' : 'WHERE b.account_id=?'} ORDER BY b.created_at DESC LIMIT 501`,
      )
      .bind(...(manager ? [] : [user.userId]))
      .all();
    const sales = await db
      .prepare(
        `SELECT s.* FROM ambassador_sales s ${manager ? '' : 'WHERE s.ambassador_id=?'} ORDER BY s.created_at DESC LIMIT 501`,
      )
      .bind(...(manager ? [] : [user.userId]))
      .all();
    const payouts = await db
      .prepare(
        `SELECT * FROM ambassador_payouts ${manager ? '' : 'WHERE ambassador_id=?'} ORDER BY paid_at DESC LIMIT 501`,
      )
      .bind(...(manager ? [] : [user.userId]))
      .all();
    const balances = await db
      .prepare(
        `SELECT b.account_id,COALESCE((SELECT SUM(commission_amount) FROM ambassador_sales WHERE ambassador_id=b.account_id AND status='earned'),0) AS earned,COALESCE((SELECT SUM(amount) FROM ambassador_payouts WHERE ambassador_id=b.account_id),0) AS paid,COALESCE((SELECT SUM(commission_amount) FROM ambassador_sales WHERE ambassador_id=b.account_id AND status='pending'),0) AS pending FROM ambassadors b ${manager ? '' : 'WHERE b.account_id=?'} ORDER BY b.created_at DESC LIMIT 501`,
      )
      .bind(...(manager ? [] : [user.userId]))
      .all();
    return json({
      manager,
      members: members.results.slice(0, 500),
      sales: sales.results.slice(0, 500),
      payouts: payouts.results.slice(0, 500),
      balances: balances.results.slice(0, 500),
      truncated: [members, sales, payouts, balances].some(
        (r) => r.results.length > 500,
      ),
    });
  } catch {
    return json({ error: 'Embaixadores temporariamente indisponíveis.' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const b = await profileBody(request);
    const db = database();
    const now = new Date().toISOString();
    if (b.action === 'join') {
      if (!['customer', 'agent'].includes(user.role))
        return json({ error: 'Acesso reservado.' }, 403);
      const account = await db
        .prepare('SELECT name FROM auth_accounts WHERE id=? AND active=1')
        .bind(user.userId)
        .first<{ name: string }>();
      if (!account) return json({ error: 'Conta indisponível.' }, 403);
      if (!(await rateLimit(request, 'ambassador-join', 10)))
        return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
      for (let attempt = 0; attempt < 100; attempt++) {
        const existing = await db
          .prepare('SELECT code FROM ambassadors WHERE account_id=?')
          .bind(user.userId)
          .first();
        if (existing) return json(existing);
        const numbers = new Uint32Array(1);
        do {
          crypto.getRandomValues(numbers);
        } while (numbers[0] >= 4294960000);
        const code =
          ambassadorPrefix(account.name) +
          String(numbers[0] % 10000).padStart(4, '0');
        await db
          .prepare(
            'INSERT OR IGNORE INTO ambassadors(account_id,code,created_at) VALUES(?,?,?)',
          )
          .bind(user.userId, code, now)
          .run();
      }
      throw Error('Não foi possível gerar um código único. Tente novamente.');
    }
    if (user.role !== 'manager')
      return json({ error: 'Acesso reservado.' }, 403);
    const id = typeof b.accountId === 'string' ? b.accountId : '';
    if (b.action === 'settings') {
      const bps = Number(b.commissionBps);
      if (
        !Number.isInteger(bps) ||
        bps < 1000 ||
        bps > 1500 ||
        typeof b.active !== 'boolean' ||
        !Number.isInteger(b.version)
      )
        throw Error('Comissão inválida (10% a 15%).');
      const results = await db.batch([
        db
          .prepare(
            'UPDATE ambassadors SET commission_bps=?,active=?,version=version+1 WHERE account_id=? AND version=?',
          )
          .bind(bps, b.active ? 1 : 0, id, b.version),
        db
          .prepare(
            'INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0',
          )
          .bind(
            crypto.randomUUID(),
            user.userId,
            'Embaixador: condições actualizadas',
            JSON.stringify({
              accountId: id,
              commissionBps: bps,
              active: b.active,
            }),
            now,
          ),
      ]);
      if (!results[0].meta.changes)
        return json({ error: 'As condições mudaram. Actualize.' }, 409);
    } else if (b.action === 'payout') {
      const amount = Number(b.amount);
      const ref = typeof b.reference === 'string' ? b.reference.trim() : '';
      if (
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        ref.length < 4 ||
        ref.length > 120 ||
        b.confirmed !== true ||
        typeof b.paidAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(b.paidAt) ||
        !Number.isFinite(Date.parse(b.paidAt)) ||
        new Date(b.paidAt + 'T00:00:00Z').toISOString().slice(0, 10) !==
          b.paidAt ||
        b.paidAt > new Date(Date.now() + 7200000).toISOString().slice(0, 10)
      )
        throw Error(
          'Confirme o pagamento realizado, o valor, a data e a referência.',
        );
      const result = await db
        .prepare(
          "INSERT INTO ambassador_payouts(id,ambassador_id,amount,reference,paid_at,recorded_by,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ambassadors WHERE account_id=?) AND ?<=(SELECT COALESCE(SUM(commission_amount),0) FROM ambassador_sales WHERE ambassador_id=? AND status='earned')-(SELECT COALESCE(SUM(amount),0) FROM ambassador_payouts WHERE ambassador_id=?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          amount,
          ref,
          b.paidAt,
          user.userId,
          now,
          id,
          amount,
          id,
          id,
        )
        .run();
      if (!result.meta.changes)
        throw Error('Saldo insuficiente. Actualize antes de registar.');
    } else if (b.action === 'resolve-sale') {
      if (
        !['earned', 'void'].includes(String(b.status)) ||
        b.confirmed !== true ||
        typeof b.reason !== 'string' ||
        b.reason.trim().length < 8 ||
        b.reason.length > 300
      )
        throw Error('Documente a revisão da comissão.');
      await db.batch([
        db
          .prepare(
            "UPDATE ambassador_sales SET status=? WHERE order_id=? AND status='held'",
          )
          .bind(b.status, b.orderId),
        db
          .prepare(
            'INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0',
          )
          .bind(
            crypto.randomUUID(),
            user.userId,
            'Embaixador: revisão de reembolso',
            JSON.stringify({
              orderId: b.orderId,
              status: b.status,
              reason: b.reason,
            }),
            now,
          ),
      ]);
    } else throw Error('Acção inválida.');
    return json({ ok: true });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQL|D1|constraint/i.test(e.message)
            ? e.message
            : 'Não foi possível guardar. Verifique a referência e tente novamente.',
      },
      422,
    );
  }
}
