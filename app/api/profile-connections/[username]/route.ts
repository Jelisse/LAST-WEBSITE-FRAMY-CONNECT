import { database } from '@/lib/server-db';
import { activeProfileSQL } from '@/lib/entitlement';
export const dynamic = 'force-dynamic';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const headers = { 'Cache-Control': 'no-store' };
  if (!/^[a-z0-9_]{3,40}$/.test(username))
    return Response.json(
      { error: 'Perfil indisponível.' },
      { status: 404, headers },
    );
  try {
    const now = new Date().toISOString();
    const db = database();
    const profile = await db
      .prepare(
        `SELECT owner_id FROM profiles WHERE username=? AND published_json IS NOT NULL AND ${activeProfileSQL}`,
      )
      .bind(username, now, now)
      .first<{ owner_id: string }>();
    if (!profile)
      return Response.json(
        { error: 'Perfil indisponível.' },
        { status: 404, headers },
      );
    const total = await db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM profile_connections WHERE owner_id=?) + COALESCE((SELECT count FROM profile_click_lifetime WHERE owner_id=?),0) AS connections',
      )
      .bind(profile.owner_id, profile.owner_id)
      .first<{ connections: number }>();
    return Response.json(
      { connections: total?.connections ?? 0, period: 'lifetime' },
      { headers },
    );
  } catch {
    return Response.json(
      { error: 'Estatísticas temporariamente indisponíveis.' },
      { status: 503, headers },
    );
  }
}
