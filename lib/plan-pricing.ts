// Fixed conversion for legacy USD prices, Banco de Moçambique, 17 September 2026.
// https://www.bancomoc.mz/en/areas-of-expertise/markets/foreign-exchange-market/
// New manager prices are stored directly in meticais and never reconverted.
export const LEGACY_USD_TO_MZN = 63.91;
export function planMeticais(plan: { meticais?: number; dollars?: number }) {
  return plan.meticais ?? Math.round((plan.dollars ?? 0) * 6391) / 100;
}
export function planPrice(plan: { meticais?: number; dollars?: number }) {
  return `${new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(planMeticais(plan))} MT`;
}
