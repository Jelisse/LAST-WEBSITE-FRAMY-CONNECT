import { corporateAssignment } from '@/lib/server-corporate';
import { database } from '@/lib/server-db';
import { corporateEmail, corporateText } from '@/lib/corporate';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { rateLimit } from '@/lib/request-limits';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { engagementLabel } from '@/lib/profile-engagement';
import { publishedProfile } from '@/lib/server-profile-access';
import type { Profile } from '@/lib/domain';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const row = await corporateAssignment(
      new URL(request.url).searchParams.get('assignment') || '',
    );
    if (!row) return json({ error: 'Campanha indisponível.' }, 404);
    return json({
      name: row.name,
      organisation: row.organisation_name,
      campaign: row.campaign_name,
      username: row.username,
      cardUrl: row.company_card_id ? '/equipa/'+row.company_card_id : null,
    });
  } catch {
    return json({ error: 'Campanha indisponível.' }, 503);
  }
}
export async function POST(request: Request) {
  try {
    const b = await profileBody(request, 4000);
    const row = await corporateAssignment(corporateText(b.assignment, 80));
    if (!row) return json({ error: 'Campanha indisponível.' }, 404);
    const db = database(),
      now = Date.now();
    if (b.action === 'lead') {
      if (!(await rateLimit(request, 'corporate-lead:' + row.id, 30, 600000)))
        return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
      if (b.consent !== true)
        throw Error('Autorize o envio dos seus dados à organização.');
      const name = corporateText(b.name, 100),
        email = b.email ? corporateEmail(b.email) : '',
        phone = corporateText(b.phone ?? '', 40, false),
        interest = corporateText(
          typeof b.interest === 'string'
            ? b.interest.replaceAll('\r', ' ').replaceAll('\n', ' ')
            : (b.interest ?? ''),
          500,
          false,
        );
      if (!email && !phone) throw Error('Indique email ou telefone.');
      if (
        typeof b.requestId !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(b.requestId)
      )
        throw Error('Pedido inválido.');
      // Repeated submissions with the same request ID do not create duplicate contacts.
      const inserted = await db
        .prepare(
          'INSERT OR IGNORE INTO corporate_leads(id,assignment_id,name,email,phone,interest,consent_version,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM corporate_assignments x JOIN corporate_campaigns c ON c.id=x.campaign_id AND c.active=1 JOIN corporate_active_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=x.account_id AND m.active=1 WHERE x.id=?)',
        )
        .bind(
          b.requestId,
          row.id,
          name,
          email,
          phone,
          interest,
          'corporate-contact-v1',
          now,
          row.id,
        )
        .run();
      if (
        !inserted.meta.changes &&
        !(await db
          .prepare(
            'SELECT 1 FROM corporate_leads WHERE id=? AND assignment_id=?',
          )
          .bind(b.requestId, row.id)
          .first())
      )
        return json({ error: 'Campanha indisponível.' }, 409);
      return json({ ok: true });
    }
    if (
      b.action !== 'metric' ||
      !row.analytics ||
      request.headers.get('dnt') === '1' ||
      request.headers.get('sec-gpc') === '1' ||
      /bot|crawler|spider|headless/i.test(
        request.headers.get('user-agent') || '',
      )
    )
      return json({ recorded: false });
    if (!(await rateLimit(request, 'corporate-metric:' + row.id, 3000)))
      return json({ recorded: false }, 429);
    const user = await getChatGPTUser();
    if (
      user &&
      (user.userId === row.account_id ||
        user.role !== 'customer' ||
        (await db
          .prepare(
            'SELECT 1 FROM corporate_members WHERE organisation_id=? AND account_id=? AND active=1',
          )
          .bind(row.organisation_id, user.userId)
          .first()))
    )
      return json({ recorded: false });
    const target = corporateText(b.target, 2000);
    if (
      !row.username ||
      (target !== 'profile_open' && b.username !== row.username)
    )
      return json({ recorded: false }, 422);
    if (target !== 'profile_open') {
      const p = await db
        .prepare(
          'SELECT published_json FROM profiles WHERE owner_id=? AND published_json IS NOT NULL',
        )
        .bind(row.account_id)
        .first<{ published_json: string }>();
      if (
        !p ||
        engagementLabel(
          await publishedProfile(
            row.account_id,
            JSON.parse(p.published_json) as Profile,
          ),
          target,
        ) === null
      )
        return json({ recorded: false }, 422);
    }
    const day = Math.floor((now + 7200000) / 86400000) * 86400000 - 7200000;
    const r = await db
      .prepare(
        'INSERT INTO corporate_metrics(assignment_id,day,target,count) SELECT ?,?,?,1 WHERE EXISTS(SELECT 1 FROM corporate_assignments x JOIN corporate_campaigns c ON c.id=x.campaign_id AND c.active=1 JOIN corporate_active_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=x.account_id AND m.active=1 WHERE x.id=? AND o.analytics=1) ON CONFLICT(assignment_id,day,target) DO UPDATE SET count=count+1',
      )
      .bind(row.id, day, target, row.id)
      .run();
    return json({ recorded: !!r.meta.changes });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error &&
          [
            'Dados inválidos.',
            'Email inválido.',
            'Indique email ou telefone.',
            'Autorize o envio dos seus dados à organização.',
            'Pedido inválido.',
          ].includes(e.message)
            ? e.message
            : 'Não foi possível enviar. Verifique os campos e tente novamente.',
      },
      422,
    );
  }
}
