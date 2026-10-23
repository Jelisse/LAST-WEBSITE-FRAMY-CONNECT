export function companyStepIssue(
  step: number,
  d: {
    company: string;
    location: string;
    phone: string;
    offer?: string;
    people: number;
  },
) {
  if (step === 0) {
    if (d.company.trim().length < 2) return 'Indique o nome da empresa.';
    if (d.location.trim().length < 2)
      return 'Indique a localização da empresa.';
    if (d.phone.replace(/\D/g, '').length < 7)
      return 'Indique um contacto telefónico válido.';
  }
  if (
    step === 1 &&
    (!Number.isInteger(d.people) ||
      d.people <
        (d.offer === 'enterprise' ? 51 : d.offer === 'business' ? 3 : 1) ||
      d.people > (d.offer === 'business' ? 50 : 500))
  )
    return 'Confirme o número de colaboradores para o plano escolhido.';
  return null;
}
export function isFirstProfile(version: number, published: boolean) {
  return version === 0 && !published;
}
