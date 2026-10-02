import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { readFulfilment, validateFulfilment } from '@/lib/fulfilment';
export const dynamic = 'force-dynamic';
export async function GET() {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado ao gestor.' }, 403);
  try {
    const row = await env.DB.prepare(
      'SELECT fulfilment_json,version FROM checkout_pricing WHERE id=1',
    ).first<{ fulfilment_json: string; version: number }>();
    const settings = readFulfilment(row?.fulfilment_json);
    if (!row || !settings) throw Error('Configuração indisponível.');
    return json({ settings, version: row.version });
  } catch {
    return json(
      {
        error:
          'As opções de recepção estão indisponíveis. Verifique as migrações.',
      },
      503,
    );
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (user?.role !== 'manager')
    return json({ error: 'Acesso reservado ao gestor.' }, 403);
  try {
    const b = await profileBody(request, 100000);
    if (!Number.isInteger(b.version) || Number(b.version) < 0)
      throw Error('Versão inválida.');
    const settings = validateFulfilment(b.settings),
      now = new Date().toISOString();
    const result = await env.DB.batch([
      env.DB.prepare(
        'UPDATE checkout_pricing SET fulfilment_json=?,version=version+1 WHERE id=1 AND version=?',
      ).bind(JSON.stringify(settings), b.version),
      env.DB.prepare(
        "INSERT INTO manager_audit(id,actor,action,subject,created_at) SELECT ?,?,'Recepção dos produtos actualizada',?,? WHERE changes()=1",
      ).bind(crypto.randomUUID(), user.userId, JSON.stringify(settings), now),
    ]);
    if (!result[0].meta.changes)
      return json(
        { error: 'As definições mudaram. Actualize antes de guardar.' },
        409,
      );
    return json({ ok: true, version: Number(b.version) + 1 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '';
    return json(
      {
        error: /D1|SQLITE|constraint/i.test(message)
          ? 'Não foi possível guardar.'
          : message || 'Não foi possível guardar.',
      },
      422,
    );
  }
}
