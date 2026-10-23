import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { corporateAccess } from '@/lib/server-corporate';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { corporateText } from '@/lib/corporate';
import {
  companyTemplate,
  companyCard,
  companyFollowup,
} from '@/lib/company-cards';
import { rateLimit } from '@/lib/request-limits';
export const dynamic = 'force-dynamic';
// Repeated in every mutation so suspended organisations/members cannot write after a preflight race.
const memberGate = `EXISTS(SELECT 1 FROM corporate_effective_members m JOIN corporate_active_organisations o ON o.id=m.organisation_id WHERE m.account_id=? AND m.organisation_id=? AND m.active=1)`;
const leaderGate = `EXISTS(SELECT 1 FROM corporate_effective_members m JOIN corporate_active_organisations o ON o.id=m.organisation_id WHERE m.account_id=? AND m.organisation_id=? AND m.active=1 AND m.role='leader')`;
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const id = corporateText(
        new URL(request.url).searchParams.get('organisation'),
        80,
      ),
      org = await corporateAccess(user.userId, id),
      db = database();
    const template = await db
      .prepare(
        'SELECT template_json,version FROM corporate_templates WHERE organisation_id=?',
      )
      .bind(id)
      .first<{ template_json: string; version: number }>();
    const leadId = new URL(request.url).searchParams.get('lead');
    if (leadId) {
      const lead = await db
        .prepare(
          `SELECT l.id,x.account_id,f.assignee FROM corporate_leads l JOIN corporate_assignments x ON x.id=l.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id LEFT JOIN corporate_followups f ON f.lead_id=l.id WHERE l.id=? AND c.organisation_id=?`,
        )
        .bind(leadId, id)
        .first<{ account_id: string; assignee: string }>();
      if (
        !lead ||
        (org.role !== 'leader' &&
          lead.account_id !== user.userId &&
          lead.assignee !== user.userId)
      )
        throw Error('Sem permissão.');
      return json({
        history: (
          await db
            .prepare(
              'SELECT h.details_json,h.created_at,a.name FROM corporate_followup_history h JOIN auth_accounts a ON a.id=h.actor_id WHERE h.lead_id=? ORDER BY h.created_at DESC LIMIT 50',
            )
            .bind(leadId)
            .all()
        ).results,
      });
    }
    const target =
      new URL(request.url).searchParams.get('account') || user.userId;
    if (target !== user.userId) {
      if (org.role !== 'leader') throw Error('Sem permissão.');
      const allowed = await db
        .prepare(
          `SELECT account_id FROM corporate_members WHERE organisation_id=? AND account_id=? AND active=1 UNION SELECT account_id FROM corporate_invites WHERE organisation_id=? AND account_id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>?`,
        )
        .bind(id, target, id, target, Date.now())
        .first();
      if (!allowed) throw Error('Colaborador indisponível.');
    }
    const card = await db
      .prepare(
        'SELECT * FROM corporate_cards WHERE organisation_id=? AND account_id=?',
      )
      .bind(id, target)
      .first();
    const prepared = await db
      .prepare(
        'SELECT draft_json,version FROM corporate_prepared_cards WHERE organisation_id=? AND account_id=?',
      )
      .bind(id, target)
      .first<{ draft_json: string; version: number }>();
    const account = await db
      .prepare('SELECT name FROM auth_accounts WHERE id=?')
      .bind(target)
      .first<{ name: string }>();
    const roster =
      org.role === 'leader'
        ? await db
            .prepare(
              `SELECT m.account_id,a.name,m.team,c.id,c.published_at,c.template_version FROM corporate_effective_members m JOIN auth_accounts a ON a.id=m.account_id LEFT JOIN corporate_cards c ON c.organisation_id=m.organisation_id AND c.account_id=m.account_id WHERE m.organisation_id=? AND m.active=1 ORDER BY a.name LIMIT 501`,
            )
            .bind(id)
            .all()
        : { results: [] };
    return json({
      organisation: id,
      account: target,
      targetActive: !!(await db
        .prepare(
          'SELECT account_id FROM corporate_effective_members WHERE organisation_id=? AND account_id=? AND active=1',
        )
        .bind(id, target)
        .first()),
      preparedVersion: prepared?.version ?? 0,
      prepared: prepared ? JSON.parse(prepared.draft_json) : null,
      pending:
        org.role === 'leader'
          ? (
              await db
                .prepare(
                  `SELECT i.account_id,i.name,i.email,i.team,i.delivery,i.expires_at,p.version AS prepared_version FROM corporate_invites i LEFT JOIN corporate_prepared_cards p ON p.organisation_id=i.organisation_id AND p.account_id=i.account_id WHERE i.organisation_id=? AND i.used_at IS NULL AND i.revoked_at IS NULL ORDER BY i.created_at DESC LIMIT 500`,
                )
                .bind(id)
                .all()
            ).results
          : [],
      metrics: org.analytics
        ? (
            await db
              .prepare(
                `SELECT t.target,SUM(t.count) AS count FROM corporate_card_metrics t JOIN corporate_cards c ON c.id=t.card_id WHERE c.organisation_id=? AND t.day>=? ${org.role === 'leader' ? '' : 'AND c.account_id=?'} GROUP BY t.target`,
              )
              .bind(
                id,
                Date.now() - 30 * 86400000,
                ...(org.role === 'leader' ? [] : [user.userId]),
              )
              .all()
          ).results
        : [],
      received:
        (
          await db
            .prepare(
              `SELECT COUNT(*) AS count FROM corporate_leads l JOIN corporate_assignments x ON x.id=l.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id WHERE c.organisation_id=? ${org.role === 'leader' ? '' : 'AND x.account_id=?'}`,
            )
            .bind(id, ...(org.role === 'leader' ? [] : [user.userId]))
            .first<{ count: number }>()
        )?.count ?? 0,
      role: org.role,
      analytics: !!org.analytics,
      template: template
        ? JSON.parse(template.template_json)
        : { company: org.name, headline: '', website: '', accent: 'orange' },
      templateVersion: template?.version ?? 0,
      card: card
        ? {
            ...card,
            draft: JSON.parse(String(card.draft_json)),
            draft_json: undefined,
            published_json: undefined,
          }
        : null,
      name: account?.name ?? '',
      roster: roster.results,
    });
  } catch {
    return json({ error: 'Organização indisponível ou sem permissão.' }, 403);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const b = await profileBody(request, 32000),
      id = corporateText(b.organisation, 80),
      db = database(),
      now = Date.now();
    if (!Number.isSafeInteger(b.version) || Number(b.version) < 0)
      throw Error('Versão inválida.');
    if (!(await rateLimit(request, 'company-cards:' + user.userId, 90, 600000)))
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    const target = b.account ? corporateText(b.account, 80) : user.userId;
    const managed = target !== user.userId;
    const access = await corporateAccess(
      user.userId,
      id,
      b.action === 'template' || managed,
    );
    if (managed && b.action !== 'save-card')
      throw Error('A publicação deve ser confirmada pelo colaborador.');
    let statement: D1PreparedStatement;
    let subject = id;
    if (b.action === 'template') {
      const value = companyTemplate(b.template);
      const old = await db
        .prepare(
          'SELECT template_json FROM corporate_templates WHERE organisation_id=?',
        )
        .bind(id)
        .first<{ template_json: string }>();
      const previous = old
        ? companyTemplate(JSON.parse(old.template_json))
        : null;
      for (const key of ['logoUrl', 'coverUrl'] as const) {
        if (
          value[key] &&
          value[key] !== previous?.[key] &&
          !(await db
            .prepare(
              'SELECT id FROM stored_assets WHERE id=? AND owner_id=? AND kind=?',
            )
            .bind(value[key]!.split('/').pop(), user.userId, 'profiles')
            .first())
        )
          throw Error('Carregue uma imagem da sua conta.');
      }
      statement = db
        .prepare(
          `INSERT INTO corporate_templates(organisation_id,template_json,version,updated_by,updated_at) SELECT ?,?,1,?,? WHERE ?=0 AND ${leaderGate} ON CONFLICT(organisation_id) DO NOTHING`,
        )
        .bind(
          id,
          JSON.stringify(value),
          user.userId,
          now,
          b.version,
          user.userId,
          id,
        );
      if (Number(b.version) > 0)
        statement = db
          .prepare(
            `UPDATE corporate_templates SET template_json=?,version=version+1,updated_by=?,updated_at=? WHERE organisation_id=? AND version=? AND ${leaderGate}`,
          )
          .bind(
            JSON.stringify(value),
            user.userId,
            now,
            id,
            b.version,
            user.userId,
            id,
          );
    } else if (
      ['save-card', 'publish-card', 'unpublish-card'].includes(String(b.action))
    ) {
      const template = await db
        .prepare(
          'SELECT version,template_json FROM corporate_templates WHERE organisation_id=?',
        )
        .bind(id)
        .first<{ version: number; template_json: string }>();
      if (!template) throw Error('Guarde primeiro o modelo da empresa.');
      if (b.templateVersion !== template.version)
        return json(
          { error: 'O modelo mudou. Actualize antes de publicar.' },
          409,
        );
      const existing = await db
        .prepare(
          'SELECT draft_json FROM corporate_cards WHERE organisation_id=? AND account_id=?',
        )
        .bind(id, target)
        .first<{ draft_json: string }>();
      const prepared = await db
        .prepare(
          'SELECT draft_json FROM corporate_prepared_cards WHERE organisation_id=? AND account_id=?',
        )
        .bind(id, target)
        .first<{ draft_json: string }>();
      const stored =
        b.action === 'unpublish-card'
          ? await db
              .prepare(
                'SELECT draft_json FROM corporate_cards WHERE organisation_id=? AND account_id=?',
              )
              .bind(id, user.userId)
              .first<{ draft_json: string }>()
          : null;
      const value = companyCard(
          b.action === 'unpublish-card' && stored
            ? JSON.parse(stored.draft_json)
            : b.card,
        ),
        publish = b.action === 'publish-card',
        unpublish = b.action === 'unpublish-card';
      if (
        value.photoUrl &&
        value.photoUrl !==
          (existing
            ? JSON.parse(existing.draft_json).photoUrl
            : prepared
              ? JSON.parse(prepared.draft_json).photoUrl
              : '') &&
        !(await db
          .prepare(
            'SELECT id FROM stored_assets WHERE id=? AND owner_id=? AND kind=?',
          )
          .bind(value.photoUrl.split('/').pop(), user.userId, 'profiles')
          .first())
      )
        throw Error('Carregue uma fotografia da sua conta.');
      if (
        !managed &&
        access.role !== 'leader' &&
        b.action !== 'unpublish-card'
      ) {
        const policy = companyTemplate(JSON.parse(template.template_json));
        const base = existing || prepared;
        const previous = base
          ? companyCard(JSON.parse(base.draft_json))
          : companyCard({
              ...value,
              name:
                (
                  await db
                    .prepare('SELECT name FROM auth_accounts WHERE id=?')
                    .bind(target)
                    .first<{ name: string }>()
                )?.name || value.name,
              title: '',
              nameFont: undefined,
              email: '',
              phone: '',
              photoUrl: '',
              whatsapp: '',
              links: [],
            });
        for (const key of [
          'name',
          'nameFont',
          'title',
          'email',
          'phone',
          'photoUrl',
          'whatsapp',
          'links',
        ] as const) {
          if (
            !policy.editable?.includes(key) &&
            JSON.stringify(value[key]) !== JSON.stringify(previous[key])
          )
            throw Error('Este campo é gerido pela empresa.');
        }
      }
      if (
        b.action === 'publish-card' &&
        !value.title &&
        !(value.showEmail && value.email) &&
        !(value.showPhone && value.phone) &&
        !value.whatsapp &&
        !value.links?.length
      )
        throw Error('Adicione uma profissão ou contacto antes de publicar.');
      subject = target;
      const cardId = crypto.randomUUID();
      const actorGate = managed ? leaderGate : memberGate;
      const recipientGate =
        'EXISTS(SELECT 1 FROM corporate_effective_members WHERE organisation_id=? AND account_id=? AND active=1)';
      const templateGate =
        'EXISTS(SELECT 1 FROM corporate_templates WHERE organisation_id=? AND version=?)';
      if (Number(b.version) === 0)
        statement = db
          .prepare(
            `INSERT INTO corporate_cards(id,organisation_id,account_id,draft_json,published_json,template_version,updated_at,published_at) SELECT ?,?,?,?,?,?,?,? WHERE ${actorGate} AND ${recipientGate} AND ${templateGate} ON CONFLICT(organisation_id,account_id) DO NOTHING`,
          )
          .bind(
            cardId,
            id,
            target,
            JSON.stringify(value),
            publish ? JSON.stringify(value) : null,
            publish ? template.version : 0,
            now,
            publish ? now : null,
            user.userId,
            id,
            id,
            target,
            id,
            b.templateVersion,
          );
      else
        statement = db
          .prepare(
            `UPDATE corporate_cards SET draft_json=?,published_json=${publish || unpublish ? '?' : 'published_json'},published_at=${publish || unpublish ? '?' : 'published_at'},version=version+1,template_version=${publish ? '?' : 'template_version'},updated_at=? WHERE organisation_id=? AND account_id=? AND version=? AND ${actorGate} AND ${recipientGate} AND ${templateGate}`,
          )
          .bind(
            JSON.stringify(value),
            ...(publish || unpublish
              ? [publish ? JSON.stringify(value) : null, publish ? now : null]
              : []),
            ...(publish ? [template.version] : []),
            now,
            id,
            target,
            b.version,
            user.userId,
            id,
            id,
            target,
            id,
            b.templateVersion,
          );
      if (
        managed &&
        !(await db
          .prepare(
            'SELECT account_id FROM corporate_effective_members WHERE organisation_id=? AND account_id=? AND active=1',
          )
          .bind(id, target)
          .first())
      ) {
        const pendingGate = `EXISTS(SELECT 1 FROM corporate_invites WHERE organisation_id=? AND account_id=? AND revoked_at IS NULL AND used_at IS NULL AND expires_at>?)`;
        statement =
          Number(b.version) === 0
            ? db
                .prepare(
                  `INSERT INTO corporate_prepared_cards(organisation_id,account_id,draft_json) SELECT ?,?,? WHERE ${leaderGate} AND ${pendingGate} ON CONFLICT(organisation_id,account_id) DO NOTHING`,
                )
                .bind(
                  id,
                  target,
                  JSON.stringify(value),
                  user.userId,
                  id,
                  id,
                  target,
                  now,
                )
            : db
                .prepare(
                  `UPDATE corporate_prepared_cards SET draft_json=?,version=version+1 WHERE organisation_id=? AND account_id=? AND version=? AND ${leaderGate} AND ${pendingGate}`,
                )
                .bind(
                  JSON.stringify(value),
                  id,
                  target,
                  b.version,
                  user.userId,
                  id,
                  id,
                  target,
                  now,
                );
      }
    } else if (b.action === 'followup') {
      const lead = corporateText(b.leadId, 80),
        value = companyFollowup(b);
      subject = lead;
      const prior = await db
        .prepare('SELECT assignee FROM corporate_followups WHERE lead_id=?')
        .bind(lead)
        .first<{ assignee: string }>();
      if (
        value.assignee !== (prior?.assignee || '') &&
        access.role !== 'leader'
      )
        throw Error('Só o responsável pode atribuir contactos.');
      if (
        value.assignee &&
        !(await db
          .prepare(
            'SELECT account_id FROM corporate_effective_members WHERE organisation_id=? AND account_id=? AND active=1',
          )
          .bind(id, value.assignee)
          .first())
      )
        throw Error('Colaborador indisponível.');
      const gate = `EXISTS(SELECT 1 FROM corporate_leads l JOIN corporate_assignments x ON x.id=l.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id JOIN corporate_effective_members actor ON actor.organisation_id=c.organisation_id AND actor.account_id=? AND actor.active=1 JOIN corporate_active_organisations o ON o.id=c.organisation_id WHERE l.id=? AND c.organisation_id=? AND (actor.role='leader' OR x.account_id=? OR EXISTS(SELECT 1 FROM corporate_followups f WHERE f.lead_id=l.id AND f.assignee=actor.account_id)) AND (actor.role='leader' OR COALESCE((SELECT assignee FROM corporate_followups WHERE lead_id=l.id),'')=?) AND (?='' OR EXISTS(SELECT 1 FROM corporate_effective_members recipient WHERE recipient.organisation_id=c.organisation_id AND recipient.account_id=? AND recipient.active=1)))`;
      const scope = [
        user.userId,
        lead,
        id,
        user.userId,
        value.assignee,
        value.assignee,
        value.assignee,
      ];
      if (Number(b.version) === 0)
        statement = db
          .prepare(
            `INSERT INTO corporate_followups(lead_id,status,note,due_date,tags,assignee,updated_by,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE ${gate} ON CONFLICT(lead_id) DO NOTHING`,
          )
          .bind(
            lead,
            value.status,
            value.note,
            value.dueDate,
            value.tags,
            value.assignee,
            user.userId,
            now,
            ...scope,
          );
      else
        statement = db
          .prepare(
            `UPDATE corporate_followups SET status=?,note=?,due_date=?,tags=?,assignee=?,version=version+1,updated_by=?,updated_at=? WHERE lead_id=? AND version=? AND ${gate}`,
          )
          .bind(
            value.status,
            value.note,
            value.dueDate,
            value.tags,
            value.assignee,
            user.userId,
            now,
            lead,
            b.version,
            ...scope,
          );
    } else throw Error('Acção inválida.');
    const result = await db.batch([
      statement,
      db
        .prepare(
          'INSERT INTO corporate_audit SELECT ?,?,?,?,?,? WHERE changes()=1',
        )
        .bind(
          crypto.randomUUID(),
          id,
          user.userId,
          String(b.action),
          subject,
          now,
        ),
      ...(b.action === 'followup'
        ? [
            db
              .prepare(
                'INSERT INTO corporate_followup_history SELECT ?,?,?,?,? WHERE changes()=1',
              )
              .bind(
                crypto.randomUUID(),
                subject,
                user.userId,
                JSON.stringify(companyFollowup(b)),
                now,
              ),
          ]
        : []),
    ]);
    return result[0].meta.changes
      ? json({ ok: true })
      : json({ error: 'Os dados mudaram. Actualize.' }, 409);
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQL|D1|constraint|corporate_/i.test(e.message)
            ? e.message
            : 'Não foi possível guardar. Tente novamente.',
      },
      422,
    );
  }
}
