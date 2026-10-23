/** Approved USD reference catalogue, 21 October 2026. Payment amounts remain
 * manager-published MZN. Company totals are quotations, never debit authority. */
export const launchOffers = [
  {
    id: 'personal',
    name: 'Personal',
    min: 1,
    max: 1,
    monthlyCents: 0,
    annualCents: 0,
  },
  {
    id: 'professional-v2',
    name: 'Professional',
    min: 1,
    max: 1,
    monthlyCents: 400,
    annualCents: 4000,
  },
  {
    id: 'business',
    name: 'Business',
    min: 3,
    max: 50,
    monthlyCents: 250,
    annualCents: 2500,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    min: 51,
    max: 500,
    monthlyCents: 200,
    annualCents: 2000,
  },
] as const;
export function companyQuote(offer: unknown, seats: unknown, cycle: unknown) {
  const plan = launchOffers.find(
    (p) => p.id === offer && ['business', 'enterprise'].includes(p.id),
  );
  if (
    !plan ||
    !Number.isInteger(seats) ||
    Number(seats) < plan.min ||
    Number(seats) > plan.max ||
    !['monthly', 'annual'].includes(String(cycle))
  )
    throw Error('Plano, período ou número de perfis inválido.');
  return {
    offer: plan.id,
    seats: Number(seats),
    cycle: String(cycle),
    currency: 'USD',
    unitCents: cycle === 'annual' ? plan.annualCents : plan.monthlyCents,
    totalCents:
      (cycle === 'annual' ? plan.annualCents : plan.monthlyCents) *
      Number(seats),
    catalogue: '2026-10-21',
    quotationOnly: true,
  };
}
export function usdPrice(cents: number) {
  return (
    '$' +
    (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: cents % 100 ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}
