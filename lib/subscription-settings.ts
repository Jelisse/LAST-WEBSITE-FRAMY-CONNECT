export const reminderDefaults = {
  enabled: true,
  daysBefore: 7,
  subject: 'Renovação do plano {plano}',
  message:
    'Olá, {nome}. O seu plano {plano} ({periodicidade}) termina em {data_fim}. Consulte o valor actual e renove na sua conta: {link_renovacao}. Não há débito automático. Após o fim do período tem 7 dias de tolerância; depois o perfil passa a contacto básico. Os seus dados ficam guardados.',
};
export type ReminderSettings = typeof reminderDefaults;
export const reminderVariables = [
  'nome',
  'plano',
  'periodicidade',
  'data_fim',
  'link_renovacao',
] as const;
export function validateReminderSettings(
  b: Record<string, unknown>,
): ReminderSettings {
  if (
    typeof b.enabled !== 'boolean' ||
    !Number.isInteger(b.daysBefore) ||
    Number(b.daysBefore) < 2 ||
    Number(b.daysBefore) > 30
  )
    throw Error('Antecedência inválida (2 a 30 dias).');
  for (const [key, max] of [
    ['subject', 160],
    ['message', 2500],
  ] as const) {
    if (typeof b[key] !== 'string' || !b[key].trim() || b[key].length > max)
      throw Error('Mensagem inválida.');
    if (key === 'subject' && /[\r\n]/.test(b[key]))
      throw Error('Assunto inválido.');
    const vars = b[key].match(/\{[^{}]+\}/g) ?? [];
    if (
      vars.some(
        (v) =>
          !(reminderVariables as readonly string[]).includes(v.slice(1, -1)),
      )
    )
      throw Error('Variável desconhecida na mensagem.');
  }
  if (!(b.message as string).includes('{link_renovacao}'))
    throw Error('Inclua {link_renovacao} na mensagem.');
  return {
    enabled: b.enabled,
    daysBefore: Number(b.daysBefore),
    subject: (b.subject as string).trim(),
    message: (b.message as string).trim(),
  };
}
export function renderReminder(
  template: string,
  values: Record<string, string>,
) {
  return template.replace(/\{([^{}]+)\}/g, (_, key) => values[key] ?? '');
}
