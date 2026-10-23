import { database } from '@/lib/server-db';
import { corporatePlan } from '@/lib/server-corporate';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const b = await profileBody(request, 1000);
    if (
      request.headers.get('dnt') === '1' ||
      request.headers.get('sec-gpc') === '1'
    )
      return json({ ok: true });
    if (
      typeof b.cardId !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(b.cardId) ||
      typeof b.target !== 'string' ||
      !/^(view|contact|email|phone|whatsapp|website|link:\d+|link-\d+)$/.test(
        b.target,
      )
    )
      return json({ error: 'Dados inválidos.' }, 422);
    if (b.target === 'view' && b.consent !== true) return json({ ok: true });
    if (!(await rateLimit(request, 'company-metric:' + b.cardId, 60, 600000)))
      return json({ ok: true });
    const db = database();
    const row = await db
      .prepare(
        `SELECT o.owner_id FROM corporate_cards c JOIN corporate_active_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=c.account_id AND m.active=1 WHERE c.id=? AND c.published_json IS NOT NULL`,
      )
      .bind(b.cardId)
      .first<{ owner_id: string }>();
    if (!row || !(await corporatePlan(row.owner_id)).analytics)
      return json({ ok: true });
    await db
      .prepare(
        `INSERT INTO corporate_card_metrics(card_id,day,target,count) SELECT ?,?,?,1 WHERE EXISTS(SELECT 1 FROM corporate_cards c JOIN corporate_active_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=c.account_id AND m.active=1 WHERE c.id=? AND c.published_json IS NOT NULL) ON CONFLICT(card_id,day,target) DO UPDATE SET count=count+1`,
      )
      .bind(
        b.cardId,
        Math.floor(Date.now() / 86400000) * 86400000,
        b.target,
        b.cardId,
      )
      .run();
    return json({ ok: true });
  } catch {
    return json({ ok: true });
  }
}
