import { funnelSQL } from '@/lib/site-funnel';
import { database } from '@/lib/server-db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManageOrders } from '@/lib/server-order-access';
import { tokenHash } from '@/lib/server-auth';
import { rateLimit } from '@/lib/request-limits';
import {
  analyticsPath,
  analyticsRange,
  cleanReferrer,
  safeCampaign,
} from '@/lib/site-analytics';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Origem não autorizada.' }, 403);
  try {
    if (
      request.headers.get('dnt') === '1' ||
      request.headers.get('sec-gpc') === '1' ||
      /bot|crawler|spider|headless/i.test(
        request.headers.get('user-agent') || '',
      )
    )
      return json({ recorded: false });
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let raw = '',
      size = 0;
    if (reader) {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 2048) {
          await reader.cancel();
          return json({ error: 'Pedido demasiado grande.' }, 413);
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
    }
    let b;
    try {
      b = JSON.parse(raw);
    } catch {
      return json({ error: 'Evento inválido.' }, 422);
    }
    if (!b || typeof b !== 'object')
      return json({ error: 'Evento inválido.' }, 422);
    const path = analyticsPath(b.path);
    if (
      !path ||
      b.consent !== true ||
      !/^[0-9a-f-]{36}$/.test(b.session || '') ||
      !/^[0-9a-f-]{36}$/.test(b.id || '') ||
      ![
        'page',
        'pulse',
        'step',
        'performance',
        'checkout_error',
        'submitted',
      ].includes(b.kind)
    )
      return json({ error: 'Evento inválido.' }, 422);
    if (
      b.kind === 'step' &&
      (!path.startsWith('/encomendar/') ||
        !Number.isInteger(b.step) ||
        b.step < 0 ||
        b.step > 5)
    )
      return json({ error: 'Etapa inválida.' }, 422);
    if (
      ['submitted', 'checkout_error'].includes(b.kind) &&
      !path.startsWith('/encomendar/')
    )
      return json({ error: 'Evento inválido.' }, 422);
    const user = await getChatGPTUser();
    if (user && user.role !== 'customer') return json({ recorded: false });
    if (!(await rateLimit(request, 'site-analytics', 25000)))
      return json({ error: 'Tente mais tarde.' }, 429);
    const db = database(),
      now = Date.now(),
      id = await tokenHash('analytics:' + b.session);
    // Preserve observed ordering if asynchronous beacons arrive out of order.
    // Bound client timestamps so they cannot write arbitrary reporting history.
    const eventAt =
      typeof b.at === 'number' &&
      Number.isFinite(b.at) &&
      b.at >= now - 300000 &&
      b.at <= now + 30000
        ? Math.min(b.at, now)
        : now;
    const cf = (request as Request & { cf?: { country?: string } }).cf;
    const country =
      typeof cf?.country === 'string' && /^[A-Z]{2}$/.test(cf.country)
        ? cf.country
        : 'unknown';
    const device = ['mobile', 'tablet', 'desktop'].includes(b.device)
      ? b.device
      : 'unknown';
    const ref = cleanReferrer(b.referrer);
    const statements = [
      db
        .prepare(
          `INSERT INTO site_sessions(id,started_at,last_seen,path,referrer,campaign,device,country) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen,path=excluded.path`,
        )
        .bind(
          id,
          now,
          now,
          path,
          ref === new URL(request.url).hostname ? 'direct' : ref,
          safeCampaign(b.campaign),
          device,
          country,
        ),
    ];
    const metric = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 120000
        ? v
        : null;
    if (b.kind === 'performance') {
      statements.push(
        db
          .prepare(
            `UPDATE site_events SET load_ms=?,lcp_ms=? WHERE id=? AND session_id=? AND kind='page'`,
          )
          .bind(metric(b.load), metric(b.lcp), b.id, id),
      );
    } else if (b.kind !== 'pulse') {
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO site_events(id,session_id,at,kind,path,step) VALUES(?,?,?,?,?,?)`,
          )
          .bind(
            b.id,
            id,
            eventAt,
            b.kind,
            path,
            b.kind === 'step' ? b.step : -1,
          ),
      );
    }
    await db.batch(statements);
    return json({ recorded: true });
  } catch {
    return json({ error: 'Estatísticas temporariamente indisponíveis.' }, 503);
  }
}
export async function GET(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user || !(await canManageOrders(user.userId)))
      return json({ error: 'Acesso reservado à gestão.' }, 403);
    const params = new URL(request.url).searchParams;
    let range;
    try {
      range = analyticsRange(params.get('from'), params.get('to'));
    } catch {
      return json({ error: 'Escolha um período válido de até 90 dias.' }, 422);
    }
    const db = database(),
      { start, end, previousStart, previousEnd } = range;
    const q = (sql: string, ...args: (string | number)[]) =>
      db.prepare(sql).bind(...args);
    const totals = `SELECT COUNT(DISTINCT session_id) AS sessions, SUM(CASE WHEN kind='page' THEN 1 ELSE 0 END) AS views, COUNT(DISTINCT CASE WHEN kind='step' THEN session_id END) AS checkouts FROM site_events WHERE at>=? AND at<?`;
    const queries = [
      q(totals, start, end),
      q(totals, previousStart, previousEnd),
      q(
        `SELECT path,COUNT(*) AS value FROM site_sessions WHERE last_seen>=? GROUP BY path ORDER BY value DESC`,
        Date.now() - 300000,
      ),
      q(
        `SELECT strftime('%Y-%m-%d',at/1000,'unixepoch','+2 hours') AS label,COUNT(*) AS views,COUNT(DISTINCT session_id) AS sessions FROM site_events WHERE kind='page' AND at>=? AND at<? GROUP BY label ORDER BY label`,
        start,
        end,
      ),
      q(
        `SELECT CAST(strftime('%w',at/1000,'unixepoch','+2 hours') AS INTEGER) AS day,CAST(strftime('%H',at/1000,'unixepoch','+2 hours') AS INTEGER) AS hour,COUNT(*) AS value FROM site_events WHERE kind='page' AND at>=? AND at<? GROUP BY day,hour`,
        start,
        end,
      ),
      q(
        `SELECT path AS label,COUNT(*) AS value FROM site_events WHERE kind='page' AND at>=? AND at<? GROUP BY path ORDER BY value DESC LIMIT 15`,
        start,
        end,
      ),
      ...['referrer', 'device', 'country', 'campaign'].map((field) =>
        q(
          `SELECT s.${field} AS label,COUNT(DISTINCT e.session_id) AS value FROM site_events e JOIN site_sessions s ON s.id=e.session_id WHERE e.at>=? AND e.at<? GROUP BY s.${field} ORDER BY value DESC LIMIT 10`,
          start,
          end,
        ),
      ),
      q(
        `SELECT step,COUNT(DISTINCT session_id) AS value FROM site_events WHERE kind='step' AND at>=? AND at<? GROUP BY step ORDER BY step`,
        start,
        end,
      ),
      q(
        `SELECT AVG(load_ms) AS load,AVG(lcp_ms) AS lcp,COUNT(load_ms) AS loadSamples,COUNT(lcp_ms) AS lcpSamples FROM site_events WHERE kind='page' AND at>=? AND at<?`,
        start,
        end,
      ),
      q(
        `SELECT kind,COUNT(*) AS value FROM site_events WHERE kind IN ('checkout_error','submitted') AND at>=? AND at<? GROUP BY kind`,
        start,
        end,
      ),
      q(
        `SELECT COUNT(*) AS submitted,SUM(CASE WHEN json_extract(data_json,'$.paid')=1 THEN 1 ELSE 0 END) AS paid FROM sandbox_orders WHERE created_at>=? AND created_at<?`,
        new Date(start).toISOString(),
        new Date(end).toISOString(),
      ),
      q(`SELECT started_at FROM site_analytics_meta WHERE id=1`),
      q(
        `SELECT e.path AS label,COUNT(*) AS value FROM site_events e WHERE e.kind='page' AND e.at>=? AND e.at<? AND e.id=(SELECT e2.id FROM site_events e2 WHERE e2.session_id=e.session_id AND e2.kind='page' ORDER BY e2.at,e2.id LIMIT 1) GROUP BY e.path ORDER BY value DESC LIMIT 10`,
        start,
        end,
      ),
    ];
    queries.push(q(funnelSQL, start, end, end, end, end, end, end, end));
    const r = await db.batch<Record<string, unknown>>(queries),
      rows = (i: number) => r[i].results;
    return json({
      funnel: rows(16)[0],
      range,
      current: rows(0)[0],
      previous: rows(1)[0],
      active: rows(2),
      daily: rows(3),
      heat: rows(4),
      pages: rows(5),
      sources: rows(6),
      devices: rows(7),
      countries: rows(8),
      campaigns: rows(9),
      steps: rows(10),
      performance: rows(11)[0],
      events: rows(12),
      orders: rows(13)[0],
      startedAt: rows(14)[0]?.started_at,
      landing: rows(15),
      updatedAt: Date.now(),
    });
  } catch {
    return json(
      {
        error:
          'Estatísticas indisponíveis. Verifique a migração 0013 e tente novamente.',
      },
      503,
    );
  }
}
