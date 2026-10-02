export const profileColors = [
  { value: 'orange', label: 'Laranja', hex: '#ee590d' },
  { value: 'white', label: 'Branco', hex: '#ffffff' },
  { value: 'blue', label: 'Azul', hex: '#1d4ed8' },
  { value: 'green', label: 'Verde', hex: '#166534' },
  { value: 'plum', label: 'Ameixa', hex: '#7e2265' },
  { value: 'slate', label: 'Ardósia', hex: '#334155' },
  { value: 'black', label: 'Preto', hex: '#171717' },
] as const;
/** Only named presets or six-digit hex colours may reach CSS or stored profiles. */
export function isProfileColor(
  value: unknown,
): value is ProfileBusiness['accent'] {
  return (
    typeof value === 'string' &&
    (profileColors.some((color) => color.value === value) ||
      /^#[0-9a-f]{6}$/i.test(value))
  );
}
export function profileColorHex(value: unknown): string {
  return (
    profileColors.find((color) => color.value === value)?.hex ??
    (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
      ? value.toLowerCase()
      : profileColors[0].hex)
  );
}
export function profileColorIsLight(value: unknown): boolean {
  const hex = profileColorHex(value);
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179;
}
export type ProfileBusiness = {
  whatsapp: string;
  message: string;
  address: string;
  hours: string;
  accent: (typeof profileColors)[number]['value'] | `#${string}`;
  layout: 'portrait' | 'compact';
};
export const defaultBusiness: ProfileBusiness = {
  whatsapp: '',
  message: '',
  address: '',
  hours: '',
  accent: 'orange',
  layout: 'portrait',
};
export function validateBusiness(value: unknown): ProfileBusiness {
  if (value === undefined) return { ...defaultBusiness };
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Dados do negócio inválidos.');
  const b = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = b[key] ?? '';
    if (
      typeof value !== 'string' ||
      value.length > max ||
      Array.from(value).some(
        (c) => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)),
      )
    )
      throw Error('Dados do negócio inválidos.');
    return value.trim();
  };
  const whatsapp = text('whatsapp', 24).replace(/[ ()-]/g, '');
  if (whatsapp && !/^\+[1-9]\d{7,14}$/.test(whatsapp))
    throw Error(
      'Use o número WhatsApp com indicativo internacional, por exemplo +258840000000.',
    );
  const accent = b.accent ?? 'orange',
    layout = b.layout ?? 'portrait';
  if (
    typeof accent !== 'string' ||
    typeof layout !== 'string' ||
    !isProfileColor(accent) ||
    !['portrait', 'compact'].includes(layout)
  )
    throw Error('Estilo do perfil inválido.');
  return {
    whatsapp,
    message: text('message', 300),
    address: text('address', 240),
    hours: text('hours', 240),
    accent: accent as ProfileBusiness['accent'],
    layout: layout as ProfileBusiness['layout'],
  };
}
export function whatsappURL(b?: ProfileBusiness) {
  return b?.whatsapp && /^\+[1-9]\d{7,14}$/.test(b.whatsapp)
    ? `https://wa.me/${b.whatsapp.slice(1)}${b.message ? '?text=' + encodeURIComponent(b.message) : ''}`
    : null;
}
export function directionsURL(address: string) {
  return (
    'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(address)
  );
}
