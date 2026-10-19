import { database } from './server-db';
import { profileMembership } from './server-profile-access';
import { hasPlanFeature, profileAccess } from './entitlement';
import { corporateTerms } from './corporate';
export async function corporatePlan(owner: string) {
  const approval = await database()
    .prepare(
      'SELECT status,seats,version FROM corporate_requests WHERE owner_id=? AND status IN (?,?)',
    )
    .bind(owner, 'approved', 'suspended')
    .first<{ status: string; seats: number; version: number }>();
  if (approval) {
    const active = await database()
      .prepare('SELECT id FROM auth_accounts WHERE id=? AND active=1')
      .bind(owner)
      .first();
    if (approval.status !== 'approved' || !active)
      throw Error('É necessária aprovação Corporativa activa.');
    return {
      enabled: true,
      seats: approval.seats,
      version: approval.version,
      analytics: true,
    };
  }
  const m = await profileMembership(owner);
  const terms = corporateTerms(m);
  if (
    !terms.enabled ||
    !['paid', 'grace'].includes(profileAccess(m)) ||
    !hasPlanFeature(m, 'teams')
  )
    throw Error('É necessário um plano Corporativo activo.');
  const account = await database()
    .prepare('SELECT id FROM auth_accounts WHERE id=? AND active=1')
    .bind(owner)
    .first();
  if (!account) throw Error('Organização indisponível.');
  return {
    ...terms,
    version: m!.version,
    analytics: hasPlanFeature(m, 'analytics'),
  };
}
export async function corporateAccess(
  user: string,
  id: string,
  leader = false,
) {
  const org = await database()
    .prepare(
      'SELECT o.*,m.role FROM corporate_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=? AND m.active=1 JOIN auth_accounts a ON a.id=m.account_id AND a.active=1 WHERE o.id=?',
    )
    .bind(user, id)
    .first<{ id: string; name: string; owner_id: string; role: string }>();
  if (!org || (leader && org.role !== 'leader'))
    throw Error('Sem permissão nesta organização.');
  return { ...org, ...(await corporatePlan(org.owner_id)) };
}
export async function corporateAssignment(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  const row = await database()
    .prepare(
      'SELECT x.*,c.organisation_id,c.name AS campaign_name,o.name AS organisation_name,p.username,a.name FROM corporate_assignments x JOIN corporate_campaigns c ON c.id=x.campaign_id AND c.active=1 JOIN corporate_organisations o ON o.id=c.organisation_id JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=x.account_id AND m.active=1 JOIN auth_accounts a ON a.id=x.account_id AND a.active=1 LEFT JOIN profiles p ON p.owner_id=a.id AND p.published_json IS NOT NULL WHERE x.id=?',
    )
    .bind(id)
    .first<{
      id: string;
      account_id: string;
      organisation_id: string;
      organisation_name: string;
      campaign_name: string;
      name: string;
      username: string | null;
    }>();
  if (!row) return null;
  const org = await database()
    .prepare('SELECT owner_id FROM corporate_organisations WHERE id=?')
    .bind(row.organisation_id)
    .first<{ owner_id: string }>();
  try {
    const plan = await corporatePlan(org!.owner_id);
    return { ...row, analytics: plan.analytics };
  } catch {
    return null;
  }
}
