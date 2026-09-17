export type ApplicationData = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  birthDate: string;
  city: string;
  occupation: string;
  description: string;
  consent: boolean;
};
export const applicationLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  SUBMITTED: 'Em análise',
  NEEDS_INFO: 'Informação adicional solicitada',
  APPROVED: 'Aprovada',
  REJECTED: 'Não aprovada',
};
export function applicationAge(date: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return -1;
  const born = new Date(date + 'T00:00:00Z');
  if (
    !Number.isFinite(born.getTime()) ||
    born.toISOString().slice(0, 10) !== date
  )
    return -1;
  const today = new Date(now.getTime() + 2 * 3600000)
    .toISOString()
    .slice(0, 10);
  if (date > today) return -1;
  return (
    Number(today.slice(0, 4)) -
    Number(date.slice(0, 4)) -
    (today.slice(5) < date.slice(5) ? 1 : 0)
  );
}
export function validateApplication(
  input: unknown,
  email: string,
): ApplicationData {
  if (!input || typeof input !== 'object') throw Error('Candidatura inválida.');
  const b = input as Record<string, unknown>;
  const labels:Record<string,string>={name:'nome',birthDate:'data de nascimento',phone:'telefone',whatsapp:'WhatsApp',city:'localidade',occupation:'actividade',description:'descrição'};
  const text = (key: string, min: number, max: number) => {
    const v = typeof b[key] === 'string' ? b[key].trim() : '';
    if (v.length < min || v.length > max)
      throw Error(`Preencha correctamente o campo ${labels[key] ?? key}.`);
    return v;
  };
  const birthDate = text('birthDate', 10, 10);
  if (applicationAge(birthDate) < 18)
    throw Error('A candidatura está disponível a partir dos 18 anos.');
  const phone = text('phone', 7, 25),
    whatsapp = text('whatsapp', 7, 25);
  if (![phone, whatsapp].every((v) => /^\+?[0-9 ()-]{7,25}$/.test(v)))
    throw Error('Indique contactos válidos, com indicativo do país.');
  if (b.consent !== true)
    throw Error('Confirme a utilização dos dados para analisar a candidatura.');
  return {
    name: text('name', 2, 100),
    email,
    phone,
    whatsapp,
    birthDate,
    city: text('city', 2, 120),
    occupation: text('occupation', 2, 160),
    description: text('description', 20, 2000),
    consent: true,
  };
}
