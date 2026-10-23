import { database } from '@/lib/server-db';
import { corporatePlan } from '@/lib/server-corporate';
import { siteURL } from '@/lib/server-site';
import { qrPNG } from '@/lib/qr-png';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/.test(id) || !siteURL())
    return new Response(null, { status: 404 });
  const row = await database()
    .prepare(
      `SELECT o.owner_id FROM corporate_cards c JOIN corporate_active_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=c.account_id AND m.active=1 WHERE c.id=? AND c.published_json IS NOT NULL`,
    )
    .bind(id)
    .first<{ owner_id: string }>();
  if (!row) return new Response(null, { status: 404 });
  try {
    await corporatePlan(row.owner_id);
  } catch {
    return new Response(null, { status: 404 });
  }
  return new Response(await qrPNG(siteURL()!.origin + '/equipa/' + id), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
