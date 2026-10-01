import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { getManagedPlans } from '@/lib/server-plans';
import { planMeticais } from '@/lib/plan-pricing';
import { validatePaymentEvidence } from '@/lib/payment-policy';
import { calendarMonthAfter, cleanText } from '@/lib/profile-growth';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { profileAccess, expiryDate } from '@/lib/entitlement';
import { profileMembership } from '@/lib/server-profile-access';
import { paysuiteReady } from '@/lib/server-paysuite';
export const dynamic = 'force-dynamic';
type Invoice = {
  id: string;
  owner_id: string;
  plan_id: string;
  terms_json: string;
  amount: number;
  status: string;
  expires_at: string;
};
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const db = database();
    const [settings, invoices, membership, notices] = await Promise.all([
      db.prepare('SELECT * FROM profile_billing_settings WHERE id=1').first(),
      db
        .prepare(
          user.role === 'manager'
            ? 'SELECT i.*,a.name,a.email FROM profile_invoices i JOIN auth_accounts a ON a.id=i.owner_id ORDER BY i.created_at DESC LIMIT 100'
            : 'SELECT * FROM profile_invoices WHERE owner_id=? ORDER BY created_at DESC LIMIT 50',
        )
        .bind(...(user.role === 'manager' ? [] : [user.userId]))
        .all(),
      profileMembership(user.userId),
      db
        .prepare(
          'SELECT id,subject,message,created_at,read_at FROM profile_notices WHERE owner_id=? ORDER BY created_at DESC LIMIT 30',
        )
        .bind(user.userId)
        .all(),
    ]);
    return json({
      gatewayAvailable: paysuiteReady(env),
      settings,
      emailConfigured: !!(env.RESEND_API_KEY && env.PROFILE_EMAIL_FROM),
      invoices: invoices.results,
      membership,
      state: profileAccess(membership),
      expiresAt: expiryDate(membership),
      plans: (await getManagedPlans()).filter(
        (p) => p.id !== 'free-30' && p.active,
      ),
      notices: notices.results,
    });
  } catch {
    return json({ error: 'Subscrições temporariamente indisponíveis.' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const b = await profileBody(request),
      db = database(),
      now = new Date().toISOString();
    if (b.action === 'settings') {
      if (user.role !== 'manager')
        return json({ error: 'Sem permissão.' }, 403);
      if (typeof b.enabled !== 'boolean' || !Number.isInteger(b.version))
        throw Error('Definições inválidas.');
      const instructions = cleanText(b.instructions, 1500, b.enabled);
      if (b.enabled && instructions.length < 20)
        throw Error(
          'Indique o destinatário e instruções de pagamento completos.',
        );
      const r = await db
        .prepare(
          'UPDATE profile_billing_settings SET enabled=?,instructions=?,opened_at=CASE WHEN ?=1 AND enabled=0 THEN ? ELSE opened_at END,version=version+1 WHERE id=1 AND version=?',
        )
        .bind(
          b.enabled ? 1 : 0,
          instructions,
          b.enabled ? 1 : 0,
          now,
          b.version,
        )
        .run();
      if (!r.meta.changes)
        return json({ error: 'As definições mudaram. Actualize.' }, 409);
      return json({ ok: true });
    }
    if (b.action === 'read-notice') {
      await db
        .prepare(
          'UPDATE profile_notices SET read_at=? WHERE id=? AND owner_id=?',
        )
        .bind(Date.now(), cleanText(b.id, 200, true), user.userId)
        .run();
      return json({ ok: true });
    }
    if (b.action === 'request') {
      if (!['customer', 'agent'].includes(user.role))
        return json({ error: 'Use uma conta de cliente.' }, 403);
      const settings = await db
        .prepare(
          'SELECT enabled,instructions FROM profile_billing_settings WHERE id=1',
        )
        .first<{ enabled: number; instructions: string }>();
      if (!settings?.enabled)
        return json(
          {
            error:
              'Os pagamentos mensais ainda não estão disponíveis. O acesso de lançamento mantém-se.',
          },
          409,
        );
      if (b.accepted !== true)
        throw Error(
          'Confirme o pagamento de um mês, sem renovação automática.',
        );
      const plan = (await getManagedPlans()).find(
        (p) =>
          p.active &&
          p.id === b.planId &&
          p.id !== 'free-30',
      );
      if (!plan || plan.monthlyEnabled === false || plan.version !== b.planVersion)
        throw Error('O plano mudou. Actualize antes de continuar.');
      const member = await profileMembership(user.userId);
      if (!member) throw Error('Active primeiro o perfil digital.');
      if (member.next_starts_at && member.next_starts_at > now)
        throw Error(
          'Já tem uma alteração paga agendada. Aguarde a activação antes de pedir outro pagamento.',
        );
      const amount = Math.round(planMeticais(plan) * 100);
      if (!Number.isSafeInteger(amount) || amount <= 0)
        throw Error('Preço indisponível.');
      await db
        .prepare(
          "UPDATE profile_invoices SET status='cancelled' WHERE owner_id=? AND status='pending' AND expires_at<=? AND instructions<>'PaySuite'",
        )
        .bind(user.userId, now)
        .run();
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT OR IGNORE INTO profile_invoices(id,owner_id,plan_id,terms_json,instructions,amount,status,created_at,expires_at) VALUES(?,?,?,?,?,?,'pending',?,?)",
        )
        .bind(
          id,
          user.userId,
          plan.id,
          JSON.stringify(plan),
          settings.instructions,
          amount,
          now,
          new Date(Date.now() + 7 * 86400000).toISOString(),
        )
        .run();
      const invoice = await db
        .prepare(
          "SELECT * FROM profile_invoices WHERE owner_id=? AND status='pending'",
        )
        .bind(user.userId)
        .first();
      return json({ ok: true, invoice });
    }
    if (b.action === 'cancel') {
      if (await db.prepare('SELECT id FROM paysuite_payments WHERE target_id=? AND kind=\'subscription\'').bind(String(b.id)).first())
        return json({error:'Consulte o estado do pagamento PaySuite antes de alterar este pedido.'},409);
      const r = await db
        .prepare(
          "UPDATE profile_invoices SET status='cancelled' WHERE id=? AND status='pending' AND owner_id=?",
        )
        .bind(cleanText(b.id, 80, true), user.userId)
        .run();
      return json({ ok: !!r.meta.changes });
    }
    if (b.action === 'confirm') {
      if (user.role !== 'manager')
        return json({ error: 'Sem permissão.' }, 403);
      if (await db.prepare('SELECT id FROM paysuite_payments WHERE target_id=? AND kind=\'subscription\'').bind(String(b.id)).first())
        return json({error:'Use a reconciliação PaySuite para confirmar este pagamento.'},409);
      const invoice = await db
        .prepare('SELECT * FROM profile_invoices WHERE id=?')
        .bind(cleanText(b.id, 80, true))
        .first<Invoice>();
      if (!invoice) throw Error('Pedido não encontrado.');
      if (invoice.status === 'confirmed')
        return json({ ok: true, alreadyConfirmed: true });
      if (invoice.status !== 'pending' || invoice.expires_at <= now)
        throw Error(
          'Pedido cancelado ou expirado. Não confirme; contacte o cliente para resolver o pagamento.',
        );
      const reference = validatePaymentEvidence(b, invoice.amount);
      // Keep physical-product and profile receipts mutually exclusive.
      if (
        await db
          .prepare(
            'SELECT id FROM payment_records WHERE provider_reference=? COLLATE NOCASE',
          )
          .bind(reference)
          .first()
      )
        throw Error('Esta transacção já foi usada num produto.');
      const m = await db
        .prepare('SELECT * FROM sandbox_memberships WHERE owner_id=?')
        .bind(invoice.owner_id)
        .first<{
          version: number;
          plan_id: string;
          paid_expires_at: string | null;
          next_plan_id: string | null;
          next_starts_at: string | null;
          next_expires_at: string | null;
        }>();
      if (!m) throw Error('Perfil não activado.');
      if (m.next_starts_at && m.next_starts_at > now)
        throw Error(
          'Já existe uma alteração paga agendada. Aguarde a sua activação.',
        );
      const current = await profileMembership(invoice.owner_id);
      const start =
        current?.paid_expires_at && current.paid_expires_at > now
          ? current.paid_expires_at
          : now;
      const end = calendarMonthAfter(start);
      const scheduled = start > now;
      const results = await db.batch([
        db
          .prepare(
            "INSERT INTO profile_receipts(reference,invoice_id,actor,amount,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM profile_invoices WHERE id=? AND status='pending' AND expires_at>?) AND EXISTS(SELECT 1 FROM sandbox_memberships WHERE owner_id=? AND version=?)",
          )
          .bind(
            reference,
            invoice.id,
            user.userId,
            invoice.amount,
            now,
            invoice.id,
            now,
            invoice.owner_id,
            m.version,
          ),
        db
          .prepare(
            scheduled
              ? 'UPDATE sandbox_memberships SET plan_id=?,terms_json=?,paid_started_at=?,paid_expires_at=?,next_plan_id=?,next_terms_json=?,next_starts_at=?,next_expires_at=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?)'
              : 'UPDATE sandbox_memberships SET plan_id=?,terms_json=?,paid_started_at=?,paid_expires_at=?,next_plan_id=NULL,next_terms_json=NULL,next_starts_at=NULL,next_expires_at=NULL,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?)',
          )
          .bind(
            ...(scheduled ? [current!.plan_id, current!.terms_json ?? null, current!.paid_started_at ?? null, current!.paid_expires_at ?? null] : []),
            invoice.plan_id,
            invoice.terms_json,
            scheduled
              ? start
              : current?.plan_id === invoice.plan_id &&
                  current.paid_expires_at &&
                  current.paid_expires_at > now
                ? current.paid_started_at!
                : now,
            end,
            now,
            invoice.owner_id,
            m.version,
            reference,
            invoice.id,
          ),
        db
          .prepare(
            "UPDATE profile_invoices SET status='confirmed',confirmed_at=?,confirmed_by=?,period_start=?,period_end=? WHERE id=? AND status='pending' AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?)",
          )
          .bind(
            now,
            user.userId,
            start,
            end,
            invoice.id,
            reference,
            invoice.id,
          ),
        db
          .prepare(
            'UPDATE profile_notices SET read_at=? WHERE owner_id=? AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=? AND invoice_id=?)',
          )
          .bind(Date.now(), invoice.owner_id, reference, invoice.id),
      ]);
      if (!results[0].meta.changes)
        return json(
          { error: 'O pedido ou plano mudou. Actualize antes de confirmar.' },
          409,
        );
      return json({ ok: true, periodStart: start, periodEnd: end, scheduled });
    }
    throw Error('Acção inválida.');
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    if (/UNIQUE|constraint/i.test(message))
      return json(
        {
          error:
            'Esta transacção já está registada. Actualize antes de tentar novamente.',
        },
        409,
      );
    return json(
      {
        error: /D1|SQLITE|no such/i.test(message)
          ? 'Serviço indisponível. Tente novamente.'
          : message || 'Não foi possível guardar.',
      },
      422,
    );
  }
}
