export type Membership = {
  plan_id: string;
  trial_started_at: string | null;
  trial_expires_at: string | null;
};
export function hasActiveTrial(
  member: Membership | null,
  now = Date.now(),
): boolean {
  if (!member || member.plan_id !== 'free-30') return false;
  const start = Date.parse(member.trial_started_at ?? '');
  const end = Date.parse(member.trial_expires_at ?? '');
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start <= now &&
    now < end &&
    end <= start + 30 * 86400000
  );
}
// Bind `now` as an ISO UTC string; both timestamps are set by the server.
export const activeProfileSQL = `EXISTS (SELECT 1 FROM sandbox_memberships m
  JOIN auth_accounts a ON a.id=m.owner_id AND a.active=1
  WHERE m.owner_id=profiles.owner_id AND m.plan_id='free-30'
  AND m.trial_started_at IS NOT NULL AND m.trial_started_at<=?
  AND m.trial_expires_at>? AND julianday(m.trial_expires_at)<=julianday(m.trial_started_at)+30)`;
