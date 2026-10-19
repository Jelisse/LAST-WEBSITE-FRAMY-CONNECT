import { corporateText } from './corporate';
export function corporateRequest(
  value: Record<string, unknown>,
  complete = true,
) {
  const people = value.people;
  if (!Number.isInteger(people) || Number(people) < 1 || Number(people) > 500)
    throw Error('Indique entre 1 e 500 trabalhadores.');
  return {
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
