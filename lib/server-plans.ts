import { database } from './server-db';
import { plans, type ManagedPlan } from './domain';
export async function getManagedPlans(): Promise<ManagedPlan[]> {
  const rows = await database()
    .prepare(
      "SELECT id,data_json,version FROM manager_records WHERE kind='plan'",
    )
    .all<{ id: string; data_json: string; version: number }>();
  const all = new Map<string, ManagedPlan>(
    plans.map((p) => [p.id, { ...p, active: true, version: 0 }]),
  );
  for (const row of rows.results)
    all.set(row.id, {
      ...JSON.parse(row.data_json),
      id: row.id,
      version: row.version,
    });
  return [...all.values()];
}
export function membershipTerms(
  row: { plan_id: string; terms_json?: string | null } | null,
): ManagedPlan {
  if (row?.terms_json) return JSON.parse(row.terms_json);
  const seed =
    plans.find((p) => p.id === (row?.plan_id ?? 'free-30')) ?? plans[0];
  return { ...seed, active: true, version: 0 };
}
