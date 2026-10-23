import { launchOffers } from './launch-offers';
import { INDIVIDUAL_PLAN } from './plan-policy';
import { planFeatures } from './plan-features';
import { planMeticais } from './plan-pricing';
import { database } from './server-db';
import { plans, legacyPlans, type ManagedPlan } from './domain';
export async function getManagedPlans(): Promise<ManagedPlan[]> {
  const rows = await database()
    .prepare(
      "SELECT id,data_json,version FROM manager_records WHERE kind='plan'",
    )
    .all<{ id: string; data_json: string; version: number }>();
  const all = new Map<string, ManagedPlan>(
    plans.map((p) => [
      p.id,
      { ...p, active: 'active' in p ? p.active : true, version: 0 },
    ]),
  );
  for (const row of rows.results.filter(
    (row) =>
      row.id !== 'free-30' &&
      (all.has(row.id) || JSON.parse(row.data_json).entitlementVersion === 1),
  ))
    all.set(row.id, {
      ...JSON.parse(row.data_json),
      id: row.id,
      version: row.version,
    });
  return [...all.values()]
    .map((p) => ({
      ...p,
      name: launchOffers.find((o) => o.id === p.id)?.name ?? p.name,
    }))
    .map((p) => ({
      ...p,
      entitlementVersion: 1,
      features: planFeatures(p),
      monthlyEnabled: p.monthlyEnabled ?? true,
      annualEnabled: p.annualEnabled ?? true,
    }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((plan) =>
      plan.id === 'personal'
        ? {
            ...plan,
            meticais: 0,
            annualMeticais: 0,
            active: true,
            monthlyEnabled: false,
            annualEnabled: false,
          }
        : { ...plan, meticais: planMeticais(plan) },
    );
}
export function membershipTerms(
  row: { plan_id: string; terms_json?: string | null } | null,
): ManagedPlan {
  if (!row || row.plan_id === 'free-30') return { ...INDIVIDUAL_PLAN };
  if (row?.terms_json) {
    const terms = JSON.parse(row.terms_json);
    return row.plan_id === 'personal'
      ? {
          ...terms,
          meticais: 0,
          annualMeticais: 0,
          monthlyEnabled: false,
          annualEnabled: false,
        }
      : terms;
  }
  const seed =
    plans.find((p) => p.id === (row?.plan_id ?? 'personal')) ??
    legacyPlans.find((p) => p.id === row?.plan_id) ??
    plans[0];
  return { ...seed, active: true, version: 0 };
}
