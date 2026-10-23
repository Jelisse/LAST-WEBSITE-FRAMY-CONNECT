import { membershipFeatures } from './entitlement.ts';
import type { WorkspaceData } from './profile-types';

export function workspacePlan(membership: WorkspaceData['membership']) {
  const id = membership.planId;
  const personal = !id || id === 'personal' || id === 'free-30';
  const name = personal
    ? 'Personal'
    : id === 'professional-v2'
      ? 'Professional'
      : membership.terms.name;
  const enabled = membershipFeatures({
    plan_id: id,
    terms_json: JSON.stringify(membership.terms),
  });
  const usable =
    membership.active &&
    !['inactive', 'basic'].includes(membership.accessState ?? '');
  const features = Object.fromEntries(
    Object.entries(enabled).map(([key, value]) => [key, usable && value]),
  ) as typeof enabled;
  return {
    name,
    personal,
    features,
    hasTools: Object.values(features).some(Boolean),
  };
}
