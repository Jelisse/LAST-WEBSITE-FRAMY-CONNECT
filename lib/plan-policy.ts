import { planFeatures } from './plan-features.ts';
export const INDIVIDUAL_PLAN = {
  id: 'personal',
  name: 'Individual',
  audience: 'Uso pessoal',
  meticais: 0,
  annualMeticais: 0,
  links: 8,
  bio: 200,
  description: 'Os seus contactos e redes sociais, num só lugar.',
  active: true,
  version: 0,
  entitlementVersion: 1 as const,
  monthlyEnabled: false,
  annualEnabled: false,
  features: planFeatures({ id: 'personal' }),
};
export function isFreeProfilePlan(id: unknown) {
  return id === 'personal' || id === 'free-30';
}
export function isPaidProfilePlan(id: unknown) {
  return typeof id === 'string' && !!id && !isFreeProfilePlan(id);
}
