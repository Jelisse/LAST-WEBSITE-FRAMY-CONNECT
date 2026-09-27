import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/server-db';
import { profileBody, profileJSON as json } from '@/lib/profile-api';
import { cleanText } from '@/lib/profile-growth';
import { hasProfessionalFeatures } from '@/lib/entitlement';
import { profileMembership } from '@/lib/server-profile-access';
export const dynamic = 'force-dynamic';
export async function GET() {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const db = database();
    const account = await db
      .prepare('SELECT email FROM auth_accounts WHERE id=? AND active=1')
      .bind(u.userId)
      .first<{ email: string }>();
    const team = await db
      .prepare('SELECT * FROM profile_teams WHERE owner_id=?')
      .bind(u.userId)
      .first<{ id: string; name: string }>();
    const [invitations, memberships, members, pending] = await Promise.all([
      db
        .prepare(
          'SELECT i.id,i.expires_at,t.name FROM profile_team_invites i JOIN profile_teams t ON t.id=i.team_id WHERE lower(i.email)=lower(?) AND i.accepted_at IS NULL AND i.expires_at>?',
        )
        .bind(account?.email ?? '', Date.now())
        .all(),
      db
        .prepare(
          'SELECT t.id,t.name FROM profile_team_members m JOIN profile_teams t ON t.id=m.team_id WHERE m.account_id=?',
        )
        .bind(u.userId)
        .all(),
      team
        ? db
            .prepare(
              'SELECT a.id,a.name,p.username,p.version,CASE WHEN p.published_json IS NULL THEN 0 ELSE 1 END AS published FROM profile_team_members m JOIN auth_accounts a ON a.id=m.account_id LEFT JOIN profiles p ON p.owner_id=m.account_id WHERE m.team_id=?',
            )
            .bind(team.id)
            .all()
        : Promise.resolve({ results: [] }),
      team
        ? db
            .prepare(
              'SELECT id,email,expires_at FROM profile_team_invites WHERE team_id=? AND accepted_at IS NULL AND expires_at>?',
            )
            .bind(team.id, Date.now())
            .all()
        : Promise.resolve({ results: [] }),
    ]);
    return json({
      team,
      invitations: invitations.results,
      memberships: memberships.results,
      members: members.results,
      pending: pending.results,
    });
  } catch {
    return json({ error: 'Equipas temporariamente indisponíveis.' }, 503);
  }
}
export async function POST(request: Request) {
  const u = await getChatGPTUser();
  if (!u) return json({ error: 'Inicie sessão.' }, 401);
  try {
    const b = await profileBody(request),
      db = database(),
      now = Date.now();
    if (b.action === 'accept') {
      if (b.consent !== true)
        throw Error(
          'Confirme que autoriza a equipa a aplicar a cor da marca ao seu perfil.',
        );
      const result = await db.batch([
        db
          .prepare(
            'INSERT OR IGNORE INTO profile_team_members(team_id,account_id,joined_at) SELECT i.team_id,?,? FROM profile_team_invites i JOIN auth_accounts a ON lower(a.email)=lower(i.email) AND a.id=? AND a.active=1 WHERE i.id=? AND i.expires_at>? AND i.accepted_at IS NULL AND (SELECT COUNT(*) FROM profile_team_members WHERE team_id=i.team_id)<25',
          )
          .bind(u.userId, now, u.userId, cleanText(b.id, 80, true), now),
        db
          .prepare(
            'UPDATE profile_team_invites SET accepted_at=? WHERE id=? AND EXISTS(SELECT 1 FROM profile_team_members WHERE team_id=profile_team_invites.team_id AND account_id=? AND joined_at=?)',
          )
          .bind(now, b.id, u.userId, now),
      ]);
      if (!result[0].meta.changes)
        throw Error('Convite indisponível, expirado ou equipa completa.');
      return json({ ok: true });
    }
    if (b.action === 'leave') {
      await db
        .prepare(
          'DELETE FROM profile_team_members WHERE team_id=? AND account_id=?',
        )
        .bind(cleanText(b.id, 80, true), u.userId)
        .run();
      return json({ ok: true });
    }
    const team = await db
      .prepare('SELECT id FROM profile_teams WHERE owner_id=?')
      .bind(u.userId)
      .first<{ id: string }>();
    if (b.action === 'remove' || b.action === 'revoke') {
      if (!team) throw Error('Equipa não encontrada.');
      await db
        .prepare(
          b.action === 'remove'
            ? 'DELETE FROM profile_team_members WHERE team_id=? AND account_id=?'
            : 'DELETE FROM profile_team_invites WHERE team_id=? AND id=?',
        )
        .bind(team.id, cleanText(b.id, 80, true))
        .run();
      return json({ ok: true });
    }
    if (!hasProfessionalFeatures(await profileMembership(u.userId)))
      return json(
        {
          error:
            'A gestão de equipa requer o plano Profissional ou uma experiência activa.',
        },
        403,
      );
    if (b.action === 'create') {
      if (team) throw Error('Já tem uma equipa.');
      await db
        .prepare(
          'INSERT INTO profile_teams(id,owner_id,name,created_at) VALUES(?,?,?,?)',
        )
        .bind(crypto.randomUUID(), u.userId, cleanText(b.name, 90, true), now)
        .run();
      return json({ ok: true });
    }
    if (!team) throw Error('Crie primeiro a equipa.');
    if (b.action === 'invite') {
      const email = cleanText(b.email, 160, true).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw Error('Email inválido.');
      const count = await db
        .prepare(
          'SELECT (SELECT COUNT(*) FROM profile_team_members WHERE team_id=?)+(SELECT COUNT(*) FROM profile_team_invites WHERE team_id=? AND accepted_at IS NULL AND expires_at>?) AS n',
        )
        .bind(team.id, team.id, now)
        .first<{ n: number }>();
      if ((count?.n ?? 25) >= 25)
        throw Error('Limite de 25 membros e convites.');
      const added = await db
        .prepare(
          'INSERT INTO profile_team_invites(id,team_id,email,expires_at) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM profile_team_members WHERE team_id=?)+(SELECT COUNT(*) FROM profile_team_invites WHERE team_id=? AND accepted_at IS NULL AND expires_at>?)<25 ON CONFLICT(team_id,email) DO UPDATE SET id=excluded.id,expires_at=excluded.expires_at,accepted_at=NULL',
        )
        .bind(
          crypto.randomUUID(),
          team.id,
          email,
          now + 7 * 86400000,
          team.id,
          team.id,
          now,
        )
        .run();
      if (!added.meta.changes) throw Error('Limite de 25 membros e convites.');
      return json({ ok: true });
    }
    if (b.action === 'brand') {
      if (
        !['orange', 'blue', 'green', 'plum', 'slate'].includes(String(b.accent))
      )
        throw Error('Cor inválida.');
      const r = await db
        .prepare(
          "UPDATE profiles SET draft_json=json_set(draft_json,'$.business.accent',?),published_json=CASE WHEN published_json IS NULL THEN NULL ELSE json_set(published_json,'$.business.accent',?) END,version=version+1,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM profile_team_members WHERE team_id=? AND account_id=profiles.owner_id)",
        )
        .bind(
          b.accent,
          b.accent,
          new Date().toISOString(),
          cleanText(b.id, 80, true),
          Number(b.version),
          team.id,
        )
        .run();
      if (!r.meta.changes)
        return json(
          { error: 'O perfil mudou ou a pessoa saiu da equipa. Actualize.' },
          409,
        );
      return json({ ok: true });
    }
    throw Error('Acção inválida.');
  } catch (e) {
    return json(
      {
        error:
          e instanceof Error && !/SQLITE|D1|no such/.test(e.message)
            ? e.message
            : 'Não foi possível actualizar a equipa.',
      },
      422,
    );
  }
}
