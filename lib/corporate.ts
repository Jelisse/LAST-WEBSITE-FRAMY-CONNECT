export function corporateTerms(
  m: { plan_id: string; terms_json?: string | null } | null,
) {
  try {
    const terms = JSON.parse(m?.terms_json || '{}');
    const enabled =
      m?.plan_id === 'corporate' || terms.corporateEnabled === true;
    const seats = terms.memberLimit ?? 25;
    return {
      enabled,
      seats: Number.isInteger(seats) && seats >= 1 && seats <= 500 ? seats : 25,
    };
  } catch {
    return { enabled: false, seats: 25 };
  }
}
export function corporateEmail(value: unknown) {
  if (typeof value !== 'string') throw Error('Email inválido.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw Error('Email inválido.');
  return email;
}
export function corporateText(value: unknown, max: number, required = true) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    throw Error('Dados inválidos.');
  for (let i = 0; i < value.length; i++)
    if (value.charCodeAt(i) < 32) throw Error('Dados inválidos.');
  return value.trim();
}
export function parseCorporateBatch(value: string) {
  if (value.length > 12000)
    throw Error('Use um máximo de 25 trabalhadores por lote.');
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length || lines.length > 25)
    throw Error('Use um máximo de 25 trabalhadores por lote.');
  const emails = new Set<string>();
  return lines.map((line) => {
    const fields = line.split(/[;\t]/);
    if (fields.length < 2 || fields.length > 3)
      throw Error('Use Nome;email;equipa, sem cabeçalho.');
    const row = {
      name: corporateText(fields[0], 100),
      email: corporateEmail(fields[1]),
      team: corporateText(fields[2] ?? '', 80, false),
    };
    if (emails.has(row.email)) throw Error('Existem emails repetidos no lote.');
    emails.add(row.email);
    return row;
  });
}
export async function processCorporateBatch(
  rows: ReturnType<typeof parseCorporateBatch>,
  send: (
    row: ReturnType<typeof parseCorporateBatch>[number],
  ) => Promise<'accepted' | 'uncertain'>,
  progress: (completed: number, uncertain: number) => void = () => {},
) {
  let completed = 0,
    uncertain = 0,
    error: string | null = null;
  for (const row of rows) {
    try {
      const delivery = await send(row);
      completed++;
      if (delivery === 'uncertain') uncertain++;
      progress(completed, uncertain);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Não foi possível enviar.';
      break;
    }
  }
  return { completed, uncertain, remaining: rows.slice(completed), error };
}
