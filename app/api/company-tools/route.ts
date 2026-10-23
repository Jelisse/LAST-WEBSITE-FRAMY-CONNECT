import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { corporateAccess } from '@/lib/server-corporate';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import {
  companyCard,
  companyTemplate,
  companyPresentation,
} from '@/lib/company-cards';
import {
  defaultToolSettings,
  directoryCard,
  toolSettings,
} from '@/lib/company-tools';
import { siteURL } from '@/lib/server-site';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const id = new URL(request.url).searchParams.get('organisation') || '',
      org = await corporateAccess(user.userId, id),
      db = database();
    const templateRow = await db
      .prepare(
        'SELECT template_json FROM corporate_templates WHERE organisation_id=?',
      )
      .bind(id)
      .first<{ template_json: string }>();
    const template = companyTemplate(
      templateRow
        ? JSON.parse(templateRow.template_json)
        : { company: org.name },
    );
    const rows = await db
      .prepare(
        `SELECT c.id,c.account_id,c.published_json,m.team FROM corporate_cards c JOIN corporate_effective_members m ON m.organisation_id=c.organisation_id AND m.account_id=c.account_id AND m.active=1 WHERE c.organisation_id=? AND c.published_json IS NOT NULL ORDER BY c.published_at DESC LIMIT 500`,
      )
      .bind(id)
      .all<{
        id: string;
        account_id: string;
        published_json: string;
        team: string;
      }>();
    const settings = await db
      .prepare(
        'SELECT settings_json,version FROM corporate_tool_settings WHERE organisation_id=?',
      )
      .bind(id)
      .first<{ settings_json: string; version: number }>();
    const origin = siteURL()?.origin || '';
    return json({
      role: org.role,
      actor: user.userId,
      origin,
      template: companyPresentation(template),
      cards: rows.results.map((row) =>
        directoryCard(
          row.id,
          row.account_id,
          row.team,
          companyCard(JSON.parse(row.published_json)),
          origin,
        ),
      ),
      settings: settings
        ? toolSettings(JSON.parse(settings.settings_json))
        : defaultToolSettings,
      version: settings?.version || 0,
    });
  } catch {
    return json({ error: 'Sem permissão nesta organização.' }, 403);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const body = await profileBody(request),
      id = typeof body.organisation === 'string' ? body.organisation : '';
    await corporateAccess(user.userId, id, true);
    if (!(await rateLimit(request, 'company-tools:' + user.userId, 40)))
      return json({ error: 'Tente novamente mais tarde.' }, 429);
    const settings = toolSettings(body.settings),
      version = Number(body.version);
    if (!Number.isInteger(version) || version < 0) throw Error();
    const result = await database()
      .prepare(
        `INSERT INTO corporate_tool_settings(organisation_id,settings_json,version,updated_by,updated_at) SELECT ?,?,1,?,? WHERE (?=0 OR EXISTS(SELECT 1 FROM corporate_tool_settings WHERE organisation_id=?)) AND EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id WHERE o.id=? AND m.account_id=? AND m.active=1 AND m.role='leader') ON CONFLICT(organisation_id) DO UPDATE SET settings_json=excluded.settings_json,version=corporate_tool_settings.version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE corporate_tool_settings.version=? AND EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id WHERE o.id=? AND m.account_id=? AND m.active=1 AND m.role='leader')`,
      )
      .bind(
        id,
        JSON.stringify(settings),
        user.userId,
        Date.now(),
        version,
        id,
        id,
        user.userId,
        version,
        id,
        user.userId,
      )
      .run();
    // Existing rows use the optimistic version predicate; new rows must start at zero.
    if (!result.meta.changes)
      return json({ error: 'Os dados mudaram. Actualize a página.' }, 409);
    return json({ ok: true, version: version + 1 });
  } catch {
    return json({ error: 'Não foi possível guardar.' }, 422);
  }
}
