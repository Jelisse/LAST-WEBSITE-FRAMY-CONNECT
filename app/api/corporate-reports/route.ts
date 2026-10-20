import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { corporateAccess } from '@/lib/server-corporate';
import { corporateText } from '@/lib/corporate';
import {
  corporateReportWindow,
  fillCorporateReportDays,
  type DailyReport,
  type TeamReport,
} from '@/lib/corporate-reports';
import { profileJSON as json } from '@/lib/profile-api';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  const query = new URL(request.url).searchParams;
  const id = query.get('organisation') || '';
  let org;
  try {
    org = await corporateAccess(user.userId, id);
  } catch {
    return json({ error: 'Organização indisponível ou sem permissão.' }, 403);
  }
  let validFilters = false;
  try {
    const now = Date.now(),
      days = Number(query.get('days') || 30),
      window = corporateReportWindow(days, now);
    const filterTeam = query.has('team');
    const campaign = corporateText(query.get('campaign') || '', 100, false),
      team = corporateText(query.get('team') || '', 80, false);
    const metric = query.get('metric') || 'contacts',
      unit = query.get('unit') || 'total';
    if (
      !['opens', 'clicks', 'contacts'].includes(metric) ||
      !['total', 'participant'].includes(unit)
    )
      throw Error('Filtro inválido.');
    validFilters = true;
    const leader = org.role === 'leader';
    const scope = leader ? '' : ' AND x.account_id=?';
    const campaignScope = campaign ? ' AND x.campaign_id=?' : '';
    const common = [
      id,
      window.since,
      window.until,
      ...(leader ? [] : [user.userId]),
      ...(campaign ? [campaign] : []),
    ];
    const cte = `WITH activity AS (
   SELECT x.account_id,t.day,SUM(CASE WHEN t.target='profile_open' THEN t.count ELSE 0 END) AS opens,SUM(CASE WHEN t.target<>'profile_open' THEN t.count ELSE 0 END) AS clicks,0 AS contacts
   FROM corporate_metrics t JOIN corporate_assignments x ON x.id=t.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id
   WHERE c.organisation_id=? AND t.day>=? AND t.day<=? ${scope}${campaignScope} AND t.count>0 AND ?=1 GROUP BY x.account_id,t.day
   UNION ALL
   SELECT x.account_id,CAST((l.created_at+7200000)/86400000 AS INTEGER)*86400000-7200000 AS day,0,0,COUNT(*)
   FROM corporate_leads l JOIN corporate_assignments x ON x.id=l.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id
   WHERE c.organisation_id=? AND l.created_at>=? AND l.created_at<=? ${scope}${campaignScope} GROUP BY x.account_id,day
  ), scoped AS (SELECT a.*,COALESCE(m.team,'') AS team FROM activity a JOIN corporate_members m ON m.organisation_id=? AND m.account_id=a.account_id ${filterTeam ? "WHERE COALESCE(m.team,'')=?" : ''})`;
    const binds = [
      ...common,
      org.analytics ? 1 : 0,
      ...common,
      id,
      ...(filterTeam ? [team] : []),
    ];
    const sort =
      unit === 'participant'
        ? `SUM(${metric})*1.0/COUNT(DISTINCT account_id)`
        : `SUM(${metric})`;
    const db = database();
    const [ranking, daily, campaigns, teams] = await db.batch([
      db
        .prepare(
          cte +
            ` SELECT team,SUM(opens) AS opens,SUM(clicks) AS clicks,SUM(contacts) AS contacts,COUNT(DISTINCT account_id) AS contributors FROM scoped GROUP BY team ORDER BY ${sort} DESC,team LIMIT 502`,
        )
        .bind(...binds),
      db
        .prepare(
          cte +
            ' SELECT day,SUM(opens) AS opens,SUM(clicks) AS clicks,SUM(contacts) AS contacts FROM scoped GROUP BY day ORDER BY day LIMIT 90',
        )
        .bind(...binds),
      db
        .prepare(
          `SELECT c.id,c.name FROM corporate_campaigns c WHERE c.organisation_id=? ${leader ? '' : 'AND EXISTS(SELECT 1 FROM corporate_assignments x WHERE x.campaign_id=c.id AND x.account_id=?)'} ORDER BY c.created_at DESC LIMIT 201`,
        )
        .bind(id, ...(leader ? [] : [user.userId])),
      db
        .prepare(
          `SELECT DISTINCT COALESCE(team,'') AS team FROM corporate_members WHERE organisation_id=? ${leader ? '' : 'AND account_id=?'} ORDER BY team LIMIT 502`,
        )
        .bind(id, ...(leader ? [] : [user.userId])),
    ]);
    const timeline = fillCorporateReportDays(
      daily.results as DailyReport[],
      days,
      now,
    );
    return json({
      name: org.name,
      role: org.role,
      analytics: org.analytics,
      days,
      generatedAt: now,
      teams: ranking.results.slice(0, 501) as TeamReport[],
      daily: timeline,
      totals: timeline.reduce(
        (sum, row) => ({
          opens: sum.opens + row.opens,
          clicks: sum.clicks + row.clicks,
          contacts: sum.contacts + row.contacts,
        }),
        { opens: 0, clicks: 0, contacts: 0 },
      ),
      campaigns: campaigns.results.slice(0, 200),
      teamOptions: teams.results.slice(0, 501),
      truncated:
        ranking.results.length > 501 ||
        campaigns.results.length > 200 ||
        teams.results.length > 501,
    });
  } catch {
    return json(
      {
        error: validFilters
          ? 'Não foi possível carregar os relatórios. Tente novamente.'
          : 'Não foi possível carregar os relatórios. Verifique os filtros e tente novamente.',
      },
      validFilters ? 503 : 422,
    );
  }
}
