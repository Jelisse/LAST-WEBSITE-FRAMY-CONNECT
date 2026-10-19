import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { corporateRequest } from '@/lib/corporate-request';
import { rateLimit } from '@/lib/request-limits';
import { canAdministerRole } from '@/lib/staff-policy';
import type { AccountRole } from '@/lib/auth-policy';
export const dynamic = 'force-dynamic';
export async function GET(request?: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const owner = request
      ? new URL(request.url).searchParams.get('owner') || u.userId
      : u.userId;
    if (owner !== u.userId) {
      const target = await database()
        .prepare('SELECT role FROM auth_accounts WHERE id=?')
        .bind(owner)
        .first<{ role: AccountRole }>();
      if (
        !['manager', 'director'].includes(u.role) ||
        !target ||
        !canAdministerRole(u.role, target.role)
      )
        return json({ error: 'Sem permissão.' }, 403);
    }
    const row = await database()
      .prepare(
        'SELECT company,details_json,people,status,version,delivery,seats FROM corporate_requests WHERE owner_id=?',
      )
      .bind(owner)
      .first();
    return json({
      request: row,
      emailReady: !!(env.RESEND_API_KEY && env.PROFILE_EMAIL_FROM),
    });
  } catch {
    return json({ error: 'Não foi possível carregar.' }, 503);
  }
}
export async function POST(request: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const b = await profileBody(request, 12000);
    if (
      !['save', 'submit'].includes(String(b.action)) ||
      !Number.isSafeInteger(b.version) ||
      Number(b.version) < 0
    )
      throw Error('Pedido inválido.');
    if (
      !(await rateLimit(request, 'corporate-request:' + u.userId, 20, 600000))
    )
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    const db = database(),
      now = Date.now();
    const current = await db
      .prepare(
        'SELECT status,version,delivery FROM corporate_requests WHERE owner_id=?',
      )
      .bind(u.userId)
      .first<{ status: string; version: number; delivery: string }>();
    if (current && current.status !== 'draft')
      return json({
        ok: true,
        status: current.status,
        delivery: current.delivery,
        version: current.version,
      });
    const details = corporateRequest(b, b.action === 'submit');
    if (b.action === 'submit' && b.confirmed !== true)
      throw Error('Confirme o envio dos dados à Framy Connect.');
    if (
      b.action === 'submit' &&
      !(env.RESEND_API_KEY && env.PROFILE_EMAIL_FROM)
    )
      return json(
        {
          error:
            'O email não está disponível. Guarde o rascunho e tente mais tarde.',
        },
        503,
      );
    const status = b.action === 'submit' ? 'submitted' : 'draft';
    const values = [
      details.company,
      JSON.stringify(details),
      details.people,
      status,
      now,
      status === 'submitted' ? now : null,
    ];
    const result =
      Number(b.version) === 0
        ? await db
            .prepare(
              'INSERT OR IGNORE INTO corporate_requests(owner_id,company,details_json,people,status,updated_at,submitted_at) VALUES(?,?,?,?,?,?,?)',
            )
            .bind(u.userId, ...values)
            .run()
        : await db
            .prepare(
              "UPDATE corporate_requests SET company=?,details_json=?,people=?,status=?,updated_at=?,submitted_at=?,version=version+1 WHERE owner_id=? AND version=? AND status='draft'",
            )
            .bind(...values, u.userId, b.version)
            .run();
    const changes = result.meta.changes;
    if (!changes) return json({ error: 'Os dados mudaram. Actualize.' }, 409);
    let delivery = 'pending';
    if (status === 'submitted') {
      delivery = 'uncertain';
      const account = await db
        .prepare('SELECT name,email FROM auth_accounts WHERE id=? AND active=1')
        .bind(u.userId)
        .first<{ name: string; email: string }>();
      if (account)
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + env.RESEND_API_KEY,
              'Content-Type': 'application/json',
              'Idempotency-Key':
                'corporate-request-' + u.userId + '-' + (Number(b.version) + 1),
            },
            body: JSON.stringify({
              from: env.PROFILE_EMAIL_FROM,
              to: ['info@framyconnect.co.mz'],
              reply_to: account.email,
              subject: 'Pedido Corporativo — ' + details.company,
              text: `Pedido Corporativo\nReferência: ${u.userId}\nContacto: ${account.name} <${account.email}>\nEmpresa: ${details.company}\nTrabalhadores: ${details.people}\nTelefone: ${details.phone}\nLocalização: ${details.location}\nSector: ${details.sector}\nEquipas: ${details.teams}\nObjectivos: ${details.goals}\nProdutos: ${details.products}\nRever em Contas e acessos no painel Framy Connect. Aprovação não confirma pagamento.`,
            }),
            signal: AbortSignal.timeout(10000),
          });
          const sent = (await response.json()) as { id?: string };
          if (response.ok && typeof sent.id === 'string' && sent.id)
            delivery = 'accepted';
        } catch {
          /* Stored request remains available to management even when email is uncertain. */
        }
      await db
        .prepare(
          'UPDATE corporate_requests SET delivery=? WHERE owner_id=? AND status=?',
        )
        .bind(delivery, u.userId, 'submitted')
        .run();
    }
    return json({ ok: true, status, delivery, version: Number(b.version) + 1 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    return json(
      {
        error:
          /^(Indique|Dados inválidos|Pedido inválido|Confirme|Origem|Pedido demasiado)/.test(
            message,
          )
            ? message
            : 'Não foi possível guardar.',
      },
      422,
    );
  }
}
