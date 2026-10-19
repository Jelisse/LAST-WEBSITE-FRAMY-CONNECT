import { corporateInvitationEmail } from '@/lib/corporate-invitation';
import { env } from 'cloudflare:workers';
import { hash } from 'bcryptjs';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { tokenHash } from '@/lib/server-auth';
import { corporateAccess, corporatePlan } from '@/lib/server-corporate';
import { corporateEmail, corporateText } from '@/lib/corporate';
import { INDIVIDUAL_PLAN } from '@/lib/plan-policy';
import { rateLimit } from '@/lib/request-limits';
import { siteURL } from '@/lib/server-site';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const db = database();
    const id = new URL(request.url).searchParams.get('organisation');
    const organisations = await db
      .prepare(
        'SELECT o.id,o.name,o.owner_id,m.role FROM corporate_organisations o JOIN corporate_members m ON m.organisation_id=o.id AND m.account_id=? AND m.active=1 ORDER BY o.created_at LIMIT 100',
      )
      .bind(u.userId)
      .all();
    let canCreate = false;
    try {
      await corporatePlan(u.userId);
      canCreate = true;
    } catch {
      /* Free accounts can accept an organisation invitation. */
    }
    if (
      canCreate &&
      (await db
        .prepare('SELECT 1 FROM corporate_organisations WHERE owner_id=?')
        .bind(u.userId)
        .first())
    )
      canCreate = false;
    if (!id)
      return json({
        organisations: organisations.results,
        actorId: u.userId,
        canCreate,
        emailReady: !!(
          env.RESEND_API_KEY &&
          env.PROFILE_EMAIL_FROM &&
          siteURL()
        ),
      });
    const org = await corporateAccess(u.userId, id);
    const leader = org.role === 'leader';
    const members = await db
      .prepare(
        `SELECT m.*,a.name,a.email,a.version AS credential_version,CASE WHEN g.account_id IS NOT NULL AND g.revoked_at IS NULL THEN 1 ELSE 0 END AS managed_access,g.provisioned_at,CASE WHEN EXISTS(SELECT 1 FROM corporate_effective_members e WHERE e.organisation_id=m.organisation_id AND e.account_id=m.account_id) THEN 1 ELSE 0 END AS within_limit FROM corporate_members m JOIN auth_accounts a ON a.id=m.account_id LEFT JOIN corporate_employee_access g ON g.organisation_id=m.organisation_id AND g.account_id=m.account_id WHERE m.organisation_id=? ${leader ? '' : 'AND m.account_id=?'} ORDER BY m.active DESC,a.name LIMIT 502`,
      )
      .bind(id, ...(leader ? [] : [u.userId]))
      .all();
    const campaigns = await db
      .prepare(
        `SELECT * FROM corporate_campaigns WHERE organisation_id=? ${leader ? '' : 'AND EXISTS(SELECT 1 FROM corporate_assignments x WHERE x.campaign_id=corporate_campaigns.id AND x.account_id=?)'} ORDER BY created_at DESC LIMIT 200`,
      )
      .bind(id, ...(leader ? [] : [u.userId]))
      .all();
    const assignments = await db
      .prepare(
        `SELECT x.*,p.username FROM corporate_assignments x JOIN corporate_campaigns c ON c.id=x.campaign_id LEFT JOIN profiles p ON p.owner_id=x.account_id AND p.published_json IS NOT NULL WHERE c.organisation_id=? ${leader ? '' : 'AND x.account_id=?'} LIMIT 2000`,
      )
      .bind(id, ...(leader ? [] : [u.userId]))
      .all();
    const days = Number(new URL(request.url).searchParams.get('days') || 30);
    if (![7, 30, 90].includes(days)) throw Error('Período inválido.');
    const since =
      Math.floor((Date.now() + 7200000) / 86400000) * 86400000 -
      7200000 -
      (days - 1) * 86400000;
    const metrics = await db
      .prepare(
        `SELECT x.account_id,x.campaign_id,t.target,SUM(t.count) AS count FROM corporate_metrics t JOIN corporate_assignments x ON x.id=t.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id WHERE c.organisation_id=? AND t.day>=? ${leader ? '' : 'AND x.account_id=?'} GROUP BY x.account_id,x.campaign_id,t.target LIMIT 5000`,
      )
      .bind(id, since, ...(leader ? [] : [u.userId]))
      .all();
    const leadCounts = await db
      .prepare(
        `SELECT x.account_id,x.campaign_id,COUNT(*) AS count FROM corporate_leads l JOIN corporate_assignments x ON x.id=l.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id WHERE c.organisation_id=? AND l.created_at>=? ${leader ? '' : 'AND x.account_id=?'} GROUP BY x.account_id,x.campaign_id LIMIT 2000`,
      )
      .bind(id, since, ...(leader ? [] : [u.userId]))
      .all();
    const leads = await db
      .prepare(
        `SELECT l.*,x.account_id,x.campaign_id FROM corporate_leads l JOIN corporate_assignments x ON x.id=l.assignment_id JOIN corporate_campaigns c ON c.id=x.campaign_id WHERE c.organisation_id=? AND l.created_at>=? ${leader ? '' : 'AND x.account_id=?'} ORDER BY l.created_at DESC LIMIT 501`,
      )
      .bind(id, since, ...(leader ? [] : [u.userId]))
      .all();
    const invites = leader
      ? await db
          .prepare(
            'SELECT id,email,name,role,team,expires_at,delivery,mode FROM corporate_invites WHERE organisation_id=? AND used_at IS NULL AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 501',
          )
          .bind(id)
          .all()
      : { results: [] };
    return json({
      organisation: { ...org, actor_id: u.userId },
      members: members.results.slice(0, 501),
      campaigns: campaigns.results,
      assignments: assignments.results,
      metrics: org.analytics ? metrics.results : [],
      leadCounts: leadCounts.results,
      leads: leads.results.slice(0, 500),
      invites: invites.results.slice(0, 500),
      truncated:
        members.results.length > 501 ||
        leads.results.length > 500 ||
        invites.results.length > 500 ||
        assignments.results.length === 2000 ||
        metrics.results.length === 5000 ||
        leadCounts.results.length === 2000 ||
        campaigns.results.length === 200,
    });
  } catch {
    return json({ error: 'Organização indisponível ou sem permissão.' }, 403);
  }
}
export async function POST(request: Request) {
  try {
    const b = await profileBody(request);
    const db = database();
    const now = Date.now();
    if (!(await rateLimit(request, 'corporate', 120, 600000)))
      return json({ error: 'Aguarde antes de tentar novamente.' }, 429);
    if (b.action === 'accept' || b.action === 'inspect-invite') {
      if (typeof b.token !== 'string' || !/^[a-f0-9]{64}$/.test(b.token))
        throw Error('Convite inválido ou expirado.');
      const key = await tokenHash(b.token);
      const invite = await db
        .prepare(
          "SELECT i.*,o.name AS organisation_name,ia.name AS inviter_name,a.name AS account_name,a.password_hash,a.active FROM corporate_invites i JOIN auth_accounts a ON a.id=i.account_id JOIN corporate_active_organisations o ON o.id=i.organisation_id JOIN corporate_effective_members issuer ON issuer.organisation_id=o.id AND issuer.account_id=i.created_by AND issuer.active=1 AND issuer.role='leader' JOIN auth_accounts ia ON ia.id=issuer.account_id AND ia.active=1 WHERE a.version=i.account_version AND i.token_hash=? AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? AND (i.role='member' OR i.created_by=o.owner_id)",
        )
        .bind(key, now)
        .first<{
          id: string;
          organisation_id: string;
          organisation_name: string;
          account_id: string;
          password_hash: string;
          active: number;
          role: string;
          team: string;
          mode: string;
          inviter_name: string;
          account_name: string;
        }>();
      if (!invite) throw Error('Convite inválido ou expirado.');
      const pending = invite.password_hash === '!corporate-pending';
      if (!pending && !invite.active)
        throw Error('Convite inválido ou expirado.');
      if (b.action === 'inspect-invite')
        return json({
          organisation: invite.organisation_name,
          role: invite.role,
          team: invite.team,
          newAccount: pending,
          mode: invite.mode,
          inviterName: invite.inviter_name,
          name: invite.account_name,
        });
      if (b.confirmed !== true)
        throw Error(
          'Confirme a associação e a partilha dos resultados da organização.',
        );
      if (invite.mode === 'authorization') {
        if (!pending || invite.active)
          throw Error('Use um convite para uma conta existente.');
        const event = crypto.randomUUID();
        const accepted = await db.batch([
          db
            .prepare(
              "UPDATE corporate_invites SET used_at=? WHERE id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=corporate_invites.created_by AND m.role='leader' WHERE o.id=corporate_invites.organisation_id) AND EXISTS(SELECT 1 FROM auth_accounts a WHERE a.id=corporate_invites.account_id AND a.version=corporate_invites.account_version AND a.active=0 AND a.password_hash='!corporate-pending')",
            )
            .bind(now, invite.id, now),
          db
            .prepare(
              'INSERT INTO corporate_audit SELECT ?,?,?,?,?,? WHERE changes()=1',
            )
            .bind(
              event,
              invite.organisation_id,
              invite.account_id,
              'authorized-managed-account',
              invite.id,
              now,
            ),
          db
            .prepare(
              'INSERT INTO corporate_employee_access(organisation_id,account_id,authorized_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)',
            )
            .bind(invite.organisation_id, invite.account_id, now, event),
          db
            .prepare(
              'INSERT INTO corporate_members(organisation_id,account_id,role,team,accepted_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)',
            )
            .bind(
              invite.organisation_id,
              invite.account_id,
              invite.role,
              invite.team,
              now,
              event,
            ),
        ]);
        if (!accepted[0].meta.changes)
          throw Error('Convite inválido ou expirado.');
        return json({ ok: true, authorized: true });
      }
      const name =
        pending && b.name !== undefined
          ? corporateText(b.name, 100)
          : invite.account_name;
      let password = invite.password_hash;
      if (pending) {
        if (
          typeof b.password !== 'string' ||
          b.password.length < 12 ||
          new TextEncoder().encode(b.password).length > 72
        )
          throw Error(
            'Defina uma palavra-passe com pelo menos 12 caracteres (máximo 72 bytes).',
          );
        password = await hash(b.password, 12);
      } else {
        const u = await getChatGPTUser();
        if (!invite.active || u?.userId !== invite.account_id)
          return json(
            { error: 'Entre na conta do email convidado antes de aceitar.' },
            401,
          );
      }
      const event = crypto.randomUUID();
      const result = await db.batch([
        db
          .prepare(
            "UPDATE corporate_invites SET used_at=? WHERE id=? AND used_at IS NULL AND revoked_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=corporate_invites.created_by AND m.active=1 AND m.role='leader' JOIN auth_accounts a ON a.id=m.account_id AND a.active=1 WHERE o.id=corporate_invites.organisation_id AND (corporate_invites.role='member' OR o.owner_id=corporate_invites.created_by)) AND EXISTS(SELECT 1 FROM auth_accounts a WHERE a.id=corporate_invites.account_id AND a.password_hash=? AND a.version=corporate_invites.account_version)",
          )
          .bind(now, invite.id, now, invite.password_hash),
        db
          .prepare(
            'INSERT INTO corporate_audit SELECT ?,?,?,?, ?,? WHERE changes()=1',
          )
          .bind(
            event,
            invite.organisation_id,
            invite.account_id,
            'accepted',
            invite.id,
            now,
          ),
        db
          .prepare(
            "UPDATE auth_accounts SET active=1,password_hash=?,name=?,version=version+1 WHERE id=? AND password_hash='!corporate-pending' AND EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)",
          )
          .bind(password, name, invite.account_id, event),
        db
          .prepare(
            'INSERT OR IGNORE INTO sandbox_memberships(owner_id,plan_id,updated_at,terms_json) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)',
          )
          .bind(
            invite.account_id,
            'personal',
            new Date().toISOString(),
            JSON.stringify(INDIVIDUAL_PLAN),
            event,
          ),
        db
          .prepare(
            'INSERT INTO corporate_members(organisation_id,account_id,role,team,accepted_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM corporate_audit WHERE id=?) ON CONFLICT(organisation_id,account_id) DO UPDATE SET active=1,role=excluded.role,team=excluded.team,left_at=NULL,accepted_at=excluded.accepted_at,version=corporate_members.version+1',
          )
          .bind(
            invite.organisation_id,
            invite.account_id,
            invite.role,
            invite.team,
            now,
            event,
          ),
      ]);
      if (!result[0].meta.changes) throw Error('Convite inválido ou expirado.');
      return json({ ok: true, signIn: pending });
    }
    const u = await getChatGPTUser();
    if (!u) return json({ error: 'Inicie sessão.' }, 401);
    if (b.action === 'create') {
      await corporatePlan(u.userId);
      const id = crypto.randomUUID();
      const name = corporateText(b.name, 100);
      await db.batch([
        db
          .prepare('INSERT INTO corporate_organisations VALUES(?,?,?,?)')
          .bind(id, u.userId, name, now),
        db
          .prepare(
            "INSERT INTO corporate_members(organisation_id,account_id,role,accepted_at) VALUES(?,?,'leader',?)",
          )
          .bind(id, u.userId, now),
      ]);
      return json({ ok: true, id });
    }
    if (b.action === 'leave') {
      const id = corporateText(b.organisation, 80);
      const owner = await db
        .prepare('SELECT owner_id FROM corporate_organisations WHERE id=?')
        .bind(id)
        .first<{ owner_id: string }>();
      if (!owner || owner.owner_id === u.userId)
        throw Error('O titular não pode abandonar a organização.');
      await db.batch([
        db
          .prepare(
            'UPDATE corporate_members SET active=0,left_at=?,version=version+1 WHERE organisation_id=? AND account_id=?',
          )
          .bind(now, id, u.userId),
        db
          .prepare(
            'UPDATE corporate_invites SET revoked_at=? WHERE organisation_id=? AND created_by=? AND used_at IS NULL AND revoked_at IS NULL AND changes()=1',
          )
          .bind(now, id, u.userId),
      ]);
      return json({ ok: true });
    }
    const org = await corporateAccess(
      u.userId,
      corporateText(b.organisation, 80),
      true,
    );
    if (b.action === 'invite') {
      if (!(env.RESEND_API_KEY && env.PROFILE_EMAIL_FROM && siteURL()))
        throw Error('O envio de convites por email não está configurado.');
      const email = corporateEmail(b.email),
        name = corporateText(b.name ?? email.split('@')[0].slice(0, 100), 100),
        team = corporateText(b.team ?? '', 80, false);
      const role = b.role === 'leader' ? 'leader' : 'member';
      if (role === 'leader' && org.owner_id !== u.userId)
        throw Error('Só o titular pode atribuir a função de líder.');
      const mode = b.mode === 'authorization' ? 'authorization' : 'invite';
      if (mode === 'authorization') {
        const account = await db
          .prepare(
            'SELECT password_hash,active FROM auth_accounts WHERE lower(email)=?',
          )
          .bind(email)
          .first<{ password_hash: string; active: number }>();
        if (
          account &&
          (account.password_hash !== '!corporate-pending' || account.active)
        )
          throw Error('Use um convite para uma conta existente.');
      }
      const existing = await db
        .prepare(
          'SELECT a.id FROM auth_accounts a JOIN corporate_members m ON m.account_id=a.id AND m.organisation_id=? AND m.active=1 WHERE lower(a.email)=?',
        )
        .bind(org.id, email)
        .first();
      if (existing) throw Error('Esta pessoa já pertence à organização.');
      const token = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        (v) => v.toString(16).padStart(2, '0'),
      ).join('');
      const id = crypto.randomUUID(),
        accountId = crypto.randomUUID();
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO auth_accounts(id,email,name,password_hash,role,active,created_at) VALUES(?,?,?,'!corporate-pending','customer',0,?)",
          )
          .bind(accountId, email, name, new Date().toISOString()),
        db
          .prepare(
            'UPDATE corporate_invites SET revoked_at=? WHERE organisation_id=? AND email=? AND used_at IS NULL AND revoked_at IS NULL',
          )
          .bind(now, org.id, email),
        db
          .prepare(
            'INSERT INTO corporate_invites(id,organisation_id,account_id,created_by,email,name,team,role,token_hash,expires_at,created_at,account_version,mode) SELECT ?,?,a.id,?,?,?,?,?,?,?,?,a.version,? FROM auth_accounts a WHERE lower(a.email)=?',
          )
          .bind(
            id,
            org.id,
            u.userId,
            email,
            name,
            team,
            role,
            await tokenHash(token),
            now + 7 * 86400000,
            now,
            mode,
            email,
          ),
      ]);
      const sender = await db
        .prepare('SELECT name FROM auth_accounts WHERE id=? AND active=1')
        .bind(u.userId)
        .first<{ name: string }>();
      const message = corporateInvitationEmail(
        org.name,
        sender?.name || 'Framy Connect',
        `${siteURL()!.origin}/corporativo/aceitar#${token}`,
        mode === 'authorization',
      );
      let accepted = false;
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json',
            'Idempotency-Key': 'corporate-' + id,
          },
          body: JSON.stringify({
            from: env.PROFILE_EMAIL_FROM,
            to: [email],
            ...message,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const body = (await r.json()) as { id?: string };
        accepted = r.ok && typeof body.id === 'string' && body.id.length > 0;
      } catch {
        /* Uncertain delivery never means confirmed inbox arrival. */
      }
      await db
        .prepare('UPDATE corporate_invites SET delivery=? WHERE id=?')
        .bind(accepted ? 'accepted' : 'uncertain', id)
        .run();
      return json({ ok: true, delivery: accepted ? 'accepted' : 'uncertain' });
    }
    const event = crypto.randomUUID();
    const guard =
      "EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=? AND m.active=1 AND m.role='leader' JOIN auth_accounts a ON a.id=m.account_id AND a.active=1 WHERE o.id=?)";
    const marker = db
      .prepare(`INSERT INTO corporate_audit SELECT ?,?,?,?,?,? WHERE ${guard}`)
      .bind(
        event,
        org.id,
        u.userId,
        String(b.action),
        typeof b.id === 'string' ? b.id : '',
        now,
        u.userId,
        org.id,
      );
    const gate = 'EXISTS(SELECT 1 FROM corporate_audit WHERE id=?)';
    let mutation: D1PreparedStatement;
    if (b.action === 'member') {
      const id = corporateText(b.id, 80);
      if (id === org.owner_id)
        throw Error('O titular não pode ser suspenso ou alterado.');
      const previous = await db
        .prepare(
          'SELECT role,left_at FROM corporate_members WHERE organisation_id=? AND account_id=?',
        )
        .bind(org.id, id)
        .first<{ role: string; left_at: number | null }>();
      if (
        org.owner_id !== u.userId &&
        (previous?.role === 'leader' || b.role === 'leader')
      )
        throw Error('Só o titular pode gerir líderes.');
      if (
        !['leader', 'member'].includes(String(b.role)) ||
        typeof b.active !== 'boolean' ||
        !Number.isInteger(b.version)
      )
        throw Error('Dados inválidos.');
      if (previous?.left_at && b.active === true)
        throw Error(
          'Envie um novo convite para voltar a associar este trabalhador.',
        );
      mutation = db
        .prepare(
          `UPDATE corporate_members SET role=?,active=?,team=?,version=version+1 WHERE organisation_id=? AND account_id=? AND version=? AND (left_at IS NULL OR ?=0) AND ${gate}`,
        )
        .bind(
          b.role,
          b.active ? 1 : 0,
          corporateText(b.team ?? '', 80, false),
          org.id,
          id,
          b.version,
          b.active ? 1 : 0,
          event,
        );
    } else if (b.action === 'revoke')
      mutation = db
        .prepare(
          `UPDATE corporate_invites SET revoked_at=? WHERE organisation_id=? AND id=? AND used_at IS NULL AND ${gate}`,
        )
        .bind(now, org.id, corporateText(b.id, 80), event);
    else if (b.action === 'campaign')
      mutation = db
        .prepare(
          `INSERT INTO corporate_campaigns SELECT ?,?,?,1,? WHERE ${gate}`,
        )
        .bind(
          crypto.randomUUID(),
          org.id,
          corporateText(b.name, 100),
          now,
          event,
        );
    else if (b.action === 'campaign-state')
      mutation = db
        .prepare(
          `UPDATE corporate_campaigns SET active=? WHERE id=? AND organisation_id=? AND ${gate}`,
        )
        .bind(
          b.active === true ? 1 : 0,
          corporateText(b.id, 80),
          org.id,
          event,
        );
    else if (b.action === 'assign')
      mutation = db
        .prepare(
          `INSERT OR IGNORE INTO corporate_assignments SELECT ?,c.id,m.account_id,? FROM corporate_campaigns c JOIN corporate_members m ON m.organisation_id=c.organisation_id AND m.active=1 AND m.account_id=? WHERE c.id=? AND c.organisation_id=? AND c.active=1 AND ${gate}`,
        )
        .bind(
          crypto.randomUUID(),
          now,
          corporateText(b.accountId, 80),
          corporateText(b.id, 80),
          org.id,
          event,
        );
    else throw Error('Acção inválida.');
    const results = await db.batch([
      marker,
      mutation,
      db
        .prepare('DELETE FROM corporate_audit WHERE id=? AND changes()=0')
        .bind(event),
    ]);
    if (!results[1].meta.changes)
      return json({ error: 'Os dados mudaram. Actualize.' }, 409);
    return json({ ok: true });
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQL|D1|constraint|corporate /i.test(e.message)
            ? e.message
            : 'Não foi possível concluir. Verifique as permissões e o limite de trabalhadores.',
      },
      422,
    );
  }
}
