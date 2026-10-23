import { companyQuote, usdPrice } from './launch-offers.ts';
import { corporateText } from './corporate.ts';
export function corporateRequest(
  value: Record<string, unknown>,
  complete = true,
) {
  const people = value.people;
  if (!Number.isInteger(people) || Number(people) < 1 || Number(people) > 500)
    throw Error('Indique entre 1 e 500 trabalhadores.');
  const quotation =
    value.offer === undefined
      ? null
      : companyQuote(value.offer, people, value.cycle ?? 'monthly');
  return {
    ...(quotation
      ? {
          offer: quotation.offer,
          cycle: quotation.cycle,
          quotation,
          referenceUSD: usdPrice(quotation.totalCents),
        }
      : {}),
    company: corporateText(value.company ?? '', 100, complete),
    people: Number(people),
    phone: corporateText(value.phone ?? '', 40, complete),
    location: corporateText(value.location ?? '', 150, complete),
    sector: corporateText(value.sector ?? '', 100, false),
    teams: corporateText(value.teams ?? '', 500, false),
    goals: corporateText(value.goals ?? '', 1000, false),
    products: corporateText(value.products ?? '', 300, false),
  };
}
