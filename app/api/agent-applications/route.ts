import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { canManageCatalog } from '@/lib/server-catalog';
import { validateApplication, applicationAge } from '@/lib/agent-application';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
type Row = {
  id: string;
  owner_id: string;
  data_json: string;
  status: string;
  version: number;
  review_note: string;
  created_at: string;
  updated_at: string;
};
async function view(row: Row) {
  const files = await database()
    .prepare('SELECT id,kind FROM application_files WHERE application_id=?')
    .bind(row.id)
    .all();
  const { data_json, ...rest } = row;
  return { ...rest, data: JSON.parse(data_json), files: files.results };
}
export async function GET(request: Request) {
  try {
    const u = await getChatGPTUser();
    if (!u) return json({ error: 'Inicie sessão.' }, 401);
    if (new URL(request.url).searchParams.get('review') === '1') {
      if (!(await canManageCatalog(u.userId)))
        return json({ error: 'Acesso reservado à gestão.' }, 403);
      const rows = await database()
        .prepare(
          "SELECT * FROM agent_applications WHERE status<>'DRAFT' ORDER BY updated_at DESC LIMIT 100",
        )
        .all<Row>();
      return json({ applications: await Promise.all(rows.results.map(view)) });
    }
    const row = await database()
      .prepare('SELECT * FROM agent_applications WHERE owner_id=?')
      .bind(u.userId)
      .first<Row>();
    return json({ application: row ? await view(row) : null });
  } catch {
    return json({ error: 'Não foi possível carregar as candidaturas.' }, 503);
  }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const u = await getChatGPTUser();
    if (!u) return json({ error: 'Inicie sessão.' }, 401);
    if (!(await rateLimit(request, 'agent-application', 40)))
      return json({ error: 'Tente novamente mais tarde.' }, 429);
    const raw = await request.text();
    if (raw.length > 14000)
      return json({ error: 'Pedido demasiado grande.' }, 413);
    const b = JSON.parse(raw),
      db = database(),
      now = new Date().toISOString();
    if (!Number.isSafeInteger(b.version) || b.version < 0)
      return json({ error: 'Versão inválida.' }, 422);
    if (b.action === 'save') {
      if (u.role !== 'customer')
        return json(
          { error: 'Esta candidatura destina-se a novas contas de agente.' },
          403,
        );
      let data;
      try {
        data = validateApplication(b.data, u.email);
      } catch (e) {
        return json({ error: (e as Error).message }, 422);
      }
      const r = await db
        .prepare(`INSERT INTO agent_applications(id,owner_id,data_json,status,version,review_note,created_at,updated_at)
        SELECT ?,?,?,'DRAFT',1,'',?,? WHERE ?=0 AND NOT EXISTS(SELECT 1 FROM agent_applications WHERE owner_id=?)
        ON CONFLICT(owner_id) DO NOTHING`)
        .bind(
          crypto.randomUUID(),
          u.userId,
          JSON.stringify(data),
          now,
          now,
          b.version,
          u.userId,
        )
        .run();
      if (!r.meta.changes) {
        const update = await db
          .prepare(
            "UPDATE agent_applications SET data_json=?,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND status IN ('DRAFT','NEEDS_INFO')",
          )
          .bind(JSON.stringify(data), now, u.userId, b.version)
          .run();
        if (!update.meta.changes)
          return json(
            {
              error:
                'A candidatura mudou ou já foi submetida. Actualize a página.',
            },
            409,
          );
      }
      return json({
        application: await view(
          (await db
            .prepare('SELECT * FROM agent_applications WHERE owner_id=?')
            .bind(u.userId)
            .first<Row>())!,
        ),
      });
    }
    if (b.action === 'submit') {
      const row = await db
        .prepare('SELECT * FROM agent_applications WHERE owner_id=?')
        .bind(u.userId)
        .first<Row>();
      if (!row) return json({ error: 'Guarde primeiro os seus dados.' }, 422);
      try {
        validateApplication(JSON.parse(row.data_json), u.email);
      } catch (e) {
        return json({ error: (e as Error).message }, 422);
      }
      const result = await db.batch([
        db
          .prepare(
            "UPDATE agent_applications SET status='SUBMITTED',version=version+1,updated_at=? WHERE id=? AND version=? AND status IN ('DRAFT','NEEDS_INFO') AND (SELECT COUNT(*) FROM application_files WHERE application_id=? AND kind IN ('portrait','id-front','id-back'))=3",
          )
          .bind(now, row.id, b.version, row.id),
        db
          .prepare(
            'INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0',
          )
          .bind(
            crypto.randomUUID(),
            u.userId,
            'Candidatura submetida',
            row.id,
            now,
          ),
      ]);
      if (!result[0].meta.changes)
        return json(
          {
            error:
              'Actualize os dados e carregue a fotografia e as duas faces do BI antes de submeter.',
          },
          409,
        );
      return json({
        application: await view(
          (await db
            .prepare('SELECT * FROM agent_applications WHERE id=?')
            .bind(row.id)
            .first<Row>())!,
        ),
      });
    }
    if (b.action === 'review') {
      if (!(await canManageCatalog(u.userId)))
        return json({ error: 'Acesso reservado à gestão.' }, 403);
      if (!['APPROVED', 'REJECTED', 'NEEDS_INFO'].includes(b.status))
        return json({ error: 'Decisão inválida.' }, 422);
      const row = await db
        .prepare('SELECT * FROM agent_applications WHERE id=?')
        .bind(String(b.id))
        .first<Row>();
      if (!row || row.owner_id === u.userId)
        return json({ error: 'Candidatura não encontrada.' }, 404);
      const note = typeof b.note === 'string' ? b.note.trim() : '';
      if (note.length > 1500 || (b.status !== 'APPROVED' && note.length < 10))
        return json(
          { error: 'Indique uma justificação entre 10 e 1500 caracteres.' },
          422,
        );
      const data = JSON.parse(row.data_json);
      if (
        b.status === 'APPROVED' &&
        (b.identityVerified !== true || applicationAge(data.birthDate) < 18)
      )
        return json(
          { error: 'Verifique o BI e a idade antes de aprovar.' },
          422,
        );
      const audit = crypto.randomUUID();
      const statements = [
        db
          .prepare(
            "UPDATE agent_applications SET status=?,review_note=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status='SUBMITTED' AND EXISTS(SELECT 1 FROM auth_accounts WHERE id=owner_id AND role='customer' AND active=1)",
          )
          .bind(b.status, note, now, row.id, b.version),
        db
          .prepare(
            'INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0',
          )
          .bind(audit, u.userId, 'Candidatura: ' + b.status, row.id, now),
      ];
      if (b.status === 'APPROVED') {
        statements.push(
          db
            .prepare(
              "INSERT INTO manager_records(id,kind,data_json,version,updated_at) SELECT ?,'agent',?,1,? WHERE EXISTS(SELECT 1 FROM manager_audit WHERE id=?)",
            )
            .bind(
              row.owner_id,
              JSON.stringify({
                id: row.owner_id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                active: true,
                version: 1,
              }),
              now,
              audit,
            ),
        );
        statements.push(
          db
            .prepare(
              "UPDATE auth_accounts SET role='agent',version=version+1 WHERE id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)",
            )
            .bind(row.owner_id, audit),
        );
        statements.push(
          db
            .prepare(
              'DELETE FROM auth_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
            )
            .bind(row.owner_id, audit),
        );
        statements.push(
          db
            .prepare(
              'DELETE FROM auth_invitations WHERE account_id=? AND EXISTS(SELECT 1 FROM manager_audit WHERE id=?)',
            )
            .bind(row.owner_id, audit),
        );
      }
      const result = await db.batch(statements);
      if (!result[0].meta.changes)
        return json(
          { error: 'A candidatura mudou. Actualize antes de decidir.' },
          409,
        );
      return json({ ok: true });
    }
    return json({ error: 'Acção inválida.' }, 422);
  } catch {
    return json({ error: 'Não foi possível guardar a candidatura.' }, 503);
  }
}
