import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user || user.role !== 'manager')
    return json({ error: 'Acesso reservado a Operações.' }, 403);
  try {
    const rows = await database()
      .prepare(
        "SELECT id,data_json,version FROM manager_records WHERE kind='agent-report' ORDER BY CASE json_extract(data_json,'$.status') WHEN 'open' THEN 0 ELSE 1 END,updated_at DESC LIMIT 200",
      )
      .all<{ id: string; data_json: string; version: number }>();
    return json({
      reports: rows.results.map((r) => ({
        ...JSON.parse(r.data_json),
        id: r.id,
        version: r.version,
      })),
    });
  } catch {
    return json({ error: 'Não foi possível carregar os relatórios.' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.role !== 'manager')
    return json({ error: 'Acesso reservado a Operações.' }, 403);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    const raw = await request.text();
    if (raw.length > 5000) throw Error('Resposta demasiado grande.');
    const b = JSON.parse(raw);
    if (
      typeof b.id !== 'string' ||
      !Number.isSafeInteger(b.version) ||
      typeof b.response !== 'string' ||
      b.response.trim().length < 5 ||
      b.response.length > 2000
    )
      throw Error('Inclua uma resposta de 5–2000 caracteres.');
    const db = database(),
      now = new Date().toISOString();
    const result = await db.batch([
      db
        .prepare(
          "UPDATE manager_records SET data_json=json_set(data_json,'$.status','resolved','$.response',?,'$.resolvedAt',?,'$.resolvedBy',?),version=version+1,updated_at=? WHERE id=? AND kind='agent-report' AND version=? AND json_extract(data_json,'$.status')='open'",
        )
        .bind(b.response.trim(), now, user.userId, now, b.id, b.version),
      db
        .prepare('INSERT INTO manager_audit SELECT ?,?,?,?,? WHERE changes()>0')
        .bind(
          crypto.randomUUID(),
          user.userId,
          'Relatório do agente resolvido',
          b.id,
          now,
        ),
    ]);
    return result[0].meta.changes
      ? json({ ok: true })
      : json(
          { error: 'O relatório mudou. Actualize antes de responder.' },
          409,
        );
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : 'Não foi possível guardar.' },
      422,
    );
  }
}
