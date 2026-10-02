import {
  publishedProfile,
  profileMembership,
} from '@/lib/server-profile-access';
import { hasPlanFeature } from '@/lib/entitlement';
import { database } from '@/lib/server-db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { activeProfileSQL } from '@/lib/entitlement';
import { tokenHash } from '@/lib/server-auth';
import { rateLimit } from '@/lib/request-limits';
import { engagementLabel } from '@/lib/profile-engagement';
import type { Profile } from '@/lib/domain';
export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ recorded: false }, 403);
  if (
    request.headers.get('dnt') === '1' ||
    request.headers.get('sec-gpc') === '1' ||
    /bot|crawler|spider|headless/i.test(request.headers.get('user-agent') ?? '')
  )
    return json({ recorded: false });
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ recorded: false }, 422);
    let size = 0,
      raw = '';
    const decoder = new TextDecoder();
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 1024) {
        await reader.cancel();
        return json({ recorded: false }, 413);
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    let b;
    try {
      b = JSON.parse(raw + decoder.decode());
    } catch {
      return json({ recorded: false }, 422);
    }
    if (
      !b ||
      b.consent !== true ||
      !/^[a-z0-9_]{3,40}$/.test(b.username ?? '') ||
      !/^[a-f0-9-]{36}$/.test(b.id ?? '') ||
      !/^[a-f0-9-]{36}$/.test(b.session ?? '') ||
      !['view', 'action'].includes(b.kind)
    )
      return json({ recorded: false }, 422);
    const now = new Date().toISOString(),
      db = database();
    const row = await db
      .prepare(
        `SELECT owner_id,published_json FROM profiles WHERE username=? AND published_json IS NOT NULL AND ${activeProfileSQL}`,
      )
      .bind(b.username, now, now)
      .first<{ owner_id: string; published_json: string }>();
    if (!row) return json({ recorded: false });
    const user = await getChatGPTUser();
    if (user?.userId === row.owner_id || (user && user.role !== 'customer'))
      return json({ recorded: false });
    if (!hasPlanFeature(await profileMembership(row.owner_id), 'analytics'))
      return json({ recorded: false });
    const target = b.kind === 'view' ? '' : b.target;
    const label =
      b.kind === 'view'
        ? ''
        : engagementLabel(
            await publishedProfile(
              row.owner_id,
              JSON.parse(row.published_json) as Profile,
            ),
            target,
          );
    if (label === null) return json({ recorded: false }, 422);
    if (!(await rateLimit(request, 'profile-engagement', 3000)))
      return json({ recorded: false }, 429);
    const session = await tokenHash(
      `${row.owner_id}:${now.slice(0, 10)}:${b.session}`,
    );
    await db
      .prepare(
        'INSERT OR IGNORE INTO profile_engagement(id,owner_id,session_hash,at,kind,target,label) VALUES(?,?,?,?,?,?,?)',
      )
      .bind(b.id, row.owner_id, session, Date.now(), b.kind, target, label)
      .run();
    return json({ recorded: true });
  } catch {
    return json({ recorded: false }, 503);
  }
}
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  const days = Number(new URL(request.url).searchParams.get('days') ?? 30);
  if (![7, 30, 90].includes(days))
    return json({ error: 'Período inválido.' }, 422);
  try {
    if (!hasPlanFeature(await profileMembership(user.userId), 'analytics'))
      return json(
        {
          error:
            'As estatísticas estão incluídas no plano Profissional e na experiência gratuita.',
        },
        403,
      );
    const db = database(),
      generatedAt = Date.now(),
      since = generatedAt - days * 86400000;
    const [summary, actions, daily] = await Promise.all([
      db
        .prepare(
          "SELECT COUNT(CASE WHEN kind='view' THEN 1 END) AS views,COUNT(DISTINCT CASE WHEN kind='view' THEN session_hash END) AS sessions,COUNT(CASE WHEN kind='action' THEN 1 END) AS actions FROM profile_engagement WHERE owner_id=? AND at>=?",
        )
        .bind(user.userId, since)
        .first(),
      db
        .prepare(
          "SELECT label,COUNT(*) AS count FROM profile_engagement WHERE owner_id=? AND at>=? AND kind='action' GROUP BY label ORDER BY count DESC LIMIT 20",
        )
        .bind(user.userId, since)
        .all(),
      db
        .prepare(
          "SELECT date(at/1000,'unixepoch','+2 hours') AS day,COUNT(CASE WHEN kind='view' THEN 1 END) AS views,COUNT(CASE WHEN kind='action' THEN 1 END) AS actions FROM profile_engagement WHERE owner_id=? AND at>=? GROUP BY day ORDER BY day DESC",
        )
        .bind(user.userId, since)
        .all(),
    ]);
    return json({
      summary,
      actions: actions.results,
      daily: daily.results,
      generatedAt,
    });
  } catch {
    return json({ error: 'Estatísticas temporariamente indisponíveis.' }, 503);
  }
}
