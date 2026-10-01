import { planFeatures, type FeatureKey } from './plan-features.ts';
import { defaultBusiness } from './profile-business.ts';
import type { Profile } from './domain.ts';
import { visibleProfileLinks, defaultExtras } from './profile-growth.ts';
export type Membership = {
  plan_id: string;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  paid_started_at?: string | null;
  paid_expires_at?: string | null;
  billing_enabled?: number;
  billing_opened_at?: string | null;
  terms_json?: string | null;
  next_starts_at?: string | null;
};
export function hasActiveTrial(
  m: Membership | null,
  now = Date.now(),
): boolean {
  if (!m || m.plan_id !== 'free-30') return false;
  const s = Date.parse(m.trial_started_at ?? ''),
    e = Date.parse(m.trial_expires_at ?? '');
  return (
    Number.isFinite(s) &&
    Number.isFinite(e) &&
    s <= now &&
    now < e &&
    e > s &&
    e <= s + 30 * 86400000
  );
}
// Availability is a manager setting. Its default keeps launch access protected.
export const PAID_PROFILE_PLANS_AVAILABLE = false;
export type AccessState =
  | 'inactive'
  | 'trial'
  | 'launch'
  | 'paid'
  | 'grace'
  | 'basic';
export function expiryDate(m: Membership | null): string | null {
  if (!m) return null;
  if (m.plan_id !== 'free-30') return m.paid_expires_at ?? null;
  const end = Date.parse(m.trial_expires_at ?? '');
  const opened = Date.parse(m.billing_opened_at ?? '');
  return Number.isFinite(end)
    ? new Date(
        Math.max(end, Number.isFinite(opened) ? opened + 7 * 86400000 : 0),
      ).toISOString()
    : null;
}
export function profileAccess(
  m: Membership | null,
  now = Date.now(),
): AccessState {
  if (!m) return 'inactive';
  const trial = m.plan_id === 'free-30';
  if (
    !trial &&
    !['personal', 'professional-v2'].includes(m.plan_id) &&
    !validPlanTerms(m)
  )
    return 'inactive';
  const s = Date.parse((trial ? m.trial_started_at : m.paid_started_at) ?? ''),
    e = Date.parse((trial ? m.trial_expires_at : m.paid_expires_at) ?? '');
  if (
    !Number.isFinite(s) ||
    !Number.isFinite(e) ||
    s > now ||
    e <= s ||
    (trial && e > s + 30 * 86400000)
  )
    return 'inactive';
  if (trial && m.billing_enabled !== 1) return now < e ? 'trial' : 'launch';
  const effective = Date.parse(expiryDate(m)!);
  if (now < effective) return trial ? 'trial' : 'paid';
  if (now < effective + 7 * 86400000) return 'grace';
  return 'basic';
}
export function hasProfileAccess(m: Membership | null, now = Date.now()) {
  return profileAccess(m, now) !== 'inactive';
}
export function validPlanTerms(m: Pick<Membership, 'plan_id' | 'terms_json'>) {
  try {
    const t = JSON.parse(m.terms_json ?? 'null');
    return (
      t?.entitlementVersion === 1 &&
      t.id === m.plan_id &&
      Number.isInteger(t.links) &&
      t.links > 0
    );
  } catch {
    return false;
  }
}
export function membershipFeatures(
  m: Pick<Membership, 'plan_id' | 'terms_json'> | null,
) {
  let terms;
  try {
    terms = JSON.parse(m?.terms_json ?? 'null');
  } catch {
    /* Legacy terms. */
  }
  return planFeatures(
    { ...terms, id: m?.plan_id ?? 'personal' },
    !terms?.entitlementVersion,
  );
}
export function hasPlanFeature(
  m: Membership | null,
  key: FeatureKey,
  now = Date.now(),
) {
  return (
    !['inactive', 'basic'].includes(profileAccess(m, now)) &&
    membershipFeatures(m)[key]
  );
}
export function hasProfessionalFeatures(
  m: Membership | null,
  now = Date.now(),
) {
  const s = profileAccess(m, now);
  return !['inactive', 'basic'].includes(s) && m?.plan_id !== 'personal';
}
export function profileForAccess(
  p: Profile,
  m: Membership | null,
  now = Date.now(),
): Profile {
  const state = profileAccess(m, now);
  if (state === 'inactive') throw Error('Perfil indisponível.');
  return profilePresentation(p, state, m);
}
export function profilePresentation(
  p: Profile,
  state: AccessState,
  m: Pick<Membership, 'plan_id' | 'terms_json'> | null,
): Profile {
  if (state === 'basic') {
    const selected = p.extras?.primaryContact;
    const choices = [
      ...(p.links ?? []),
      ...(p.showEmail && p.email
        ? [{ label: 'Email', url: 'mailto:' + p.email }]
        : []),
      ...(p.showPhone && p.phone
        ? [{ label: 'Telefone', url: 'tel:' + p.phone }]
        : []),
      ...(p.business?.whatsapp
        ? [
            {
              label: 'WhatsApp',
              url:
                'https://wa.me/' + p.business.whatsapp.replace(/[^0-9]/g, ''),
            },
          ]
        : []),
    ];
    const contact = choices.find((l) => l.url === selected) ?? choices[0];
    return {
      name: p.name,
      username: p.username,
      title: '',
      email: '',
      phone: '',
      website: '',
      showEmail: false,
      showPhone: false,
      photoUrl: p.photoUrl,
      photoPosition: p.photoPosition,
      bio: '',
      links: contact ? [contact] : [],
      extras: { ...defaultExtras },
    };
  }
  const personal = m?.plan_id === 'personal';
  let limits = { links: personal ? 8 : 20, bio: personal ? 200 : 600 };
  try {
    const terms = JSON.parse(m?.terms_json ?? 'null');
    if (
      terms &&
      Number.isInteger(terms.links) &&
      terms.links > 0 &&
      terms.links <= 50 &&
      Number.isInteger(terms.bio) &&
      terms.bio >= 0 &&
      terms.bio <= 1200
    )
      limits = terms;
  } catch {
    /* Fall back to current catalogue limits. */
  }
  const features = membershipFeatures(m);
  const business = { ...defaultBusiness, ...p.business };
  if (!features.whatsapp) {
    business.whatsapp = '';
    business.message = '';
  }
  if (!features.location) {
    business.address = '';
    business.hours = '';
  }
  return {
    ...p,
    business,
    links: visibleProfileLinks(p, limits.links),
    bio: (p.bio ?? '').slice(0, limits.bio),
    extras: {
      ...defaultExtras,
      ...p.extras,
      services: features.showcase
        ? (p.extras?.services ?? []).map((s) =>
            features.english
              ? s
              : {
                  ...s,
                  englishTitle: '',
                  englishDescription: '',
                  englishPrice: '',
                },
          )
        : [],
      enquiries: features.enquiries && !!p.extras?.enquiries,
      english: features.english
        ? {
            ...(p.extras?.english ?? defaultExtras.english),
            hours: features.location ? (p.extras?.english.hours ?? '') : '',
          }
        : defaultExtras.english,
      visibleLinks: null,
      primaryContact: '',
    },
  };
}
// Two `now` ISO bindings are retained for existing callers. Basic pages remain reachable.
export const activeProfileSQL = `EXISTS (SELECT 1 FROM profile_membership_view m JOIN auth_accounts a ON a.id=m.owner_id AND a.active=1 WHERE m.owner_id=profiles.owner_id AND ((m.plan_id='free-30' AND m.trial_started_at<=? AND julianday(m.trial_expires_at)>julianday(m.trial_started_at) AND julianday(m.trial_expires_at)<=julianday(m.trial_started_at)+30) OR ((m.plan_id IN ('personal','professional-v2') OR (json_valid(m.terms_json) AND json_extract(m.terms_json,'$.entitlementVersion')=1 AND json_extract(m.terms_json,'$.id')=m.plan_id)) AND m.paid_started_at<=? AND julianday(m.paid_expires_at)>julianday(m.paid_started_at))))`;
