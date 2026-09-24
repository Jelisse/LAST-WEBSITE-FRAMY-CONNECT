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
    plans.map((p) => [p.id, { ...p, active: true, version: 0 }]),
  );
  for (const row of rows.results.filter(row => all.has(row.id)))
    all.set(row.id, {
      ...JSON.parse(row.data_json),
      id: row.id,
      version: row.version,
    });
  return [...all.values()].map((plan) => plan.id === 'free-30' ? { ...plan, meticais: 0, links: Math.max(20, plan.links), bio: Math.max(600, plan.bio) } : { ...plan, meticais: planMeticais(plan) });
}
export function membershipTerms(
  row: { plan_id: string; terms_json?: string | null } | null,
): ManagedPlan {
  if (row?.terms_json) {
    const terms = JSON.parse(row.terms_json);
    return row.plan_id === 'free-30' ? { ...terms, meticais: 0, links: Math.max(20, terms.links), bio: Math.max(600, terms.bio) } : terms;
  }
  const seed =
    plans.find((p) => p.id === (row?.plan_id ?? 'free-30')) ?? legacyPlans.find(p => p.id === row?.plan_id) ?? plans[0];
  return { ...seed, active: true, version: 0 };
}
