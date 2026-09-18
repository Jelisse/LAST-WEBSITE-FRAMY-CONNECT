import messages from './translations.json';
export const locales = ['pt-MZ', 'en', 'zh-Hant'] as const;
export type Locale = (typeof locales)[number];
export function validLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : 'pt-MZ';
}
export function translator(locale: Locale) {
  function t<T>(value: T, params: unknown[] = []): T {
    if (typeof value !== 'string' || !value.trim()) return value;
    const reference = value.match(/^(.*) Referência: ([a-f0-9-]{36})$/);
    if (reference)
      return `${t(reference[1])} ${t('Referência:')} ${reference[2]}` as T;
    const fieldPatterns: [RegExp, string][] = [
      [
        /^Preencha correctamente o campo ([^{}]+)\.$/,
        'Preencha correctamente o campo {0}.',
      ],
      [/^O campo ([^{}]+) é inválido\.$/, 'O campo {0} é inválido.'],
      [/^Campo ([^{}]+) inválido\.$/, 'Campo {0} inválido.'],
    ];
    for (const [pattern, key] of fieldPatterns) {
      const match = value.match(pattern);
      if (match) return t(key, [t(match[1])]) as T;
    }
    const planLimit = value.match(
      /^O plano (.+) permite (\d+) (links|caracteres de biografia)\. (.+)$/,
    );
    if (planLimit)
      return t(
        planLimit[3] === 'links'
          ? 'O plano {0} permite {1} links. Remova links ou escolha um plano superior.'
          : 'O plano {0} permite {1} caracteres de biografia. Reduza o texto ou escolha um plano superior.',
        [t(planLimit[1]), planLimit[2]],
      ) as T;
    const entry = Object.hasOwn(messages, value.trim())
      ? (messages as Record<string, string[]>)[value.trim()]
      : undefined;
    const translated =
      locale === 'pt-MZ' || !entry
        ? value.trim()
        : entry[locale === 'en' ? 0 : 1];
    return (value.match(/^\s*/)?.[0] +
      translated.replace(/\{(\d+)\}/g, (match, index) =>
        index in params ? String(params[index]) : match,
      ) +
      value.match(/\s*$/)?.[0]) as T;
  }
  return Object.assign(t, { locale });
}
