export const profileColors = [
  { value: 'orange', label: 'Laranja Framy', hex: '#ee590d', ink: '#32251e', muted: '#695347', accent: '#a33b09' },
  { value: 'black', label: 'Preto', hex: '#101112', ink: '#f7f4ef', muted: '#c5bfb7', accent: '#f7a873' },
  { value: 'charcoal', label: 'Carvão', hex: '#28292b', ink: '#faf7f2', muted: '#cec8c0', accent: '#f6b080' },
  { value: 'white', label: 'Branco', hex: '#ffffff', ink: '#232427', muted: '#626369', accent: '#a73c09' },
  { value: 'porcelain', label: 'Porcelana', hex: '#f5f3ee', ink: '#2e2d2b', muted: '#69655f', accent: '#9a441b' },
  { value: 'rose', label: 'Rosa', hex: '#ead9dc', ink: '#402e38', muted: '#725660', accent: '#804255' },
  { value: 'sage', label: 'Sálvia', hex: '#dce3d9', ink: '#2b3c32', muted: '#526357', accent: '#365b45' },
  { value: 'sand', label: 'Areia', hex: '#e9dfd0', ink: '#3b3028', muted: '#6d5b4c', accent: '#845031' },
] as const;
// Old records remain valid; the editor offers only the curated themes above.
const legacyColors = { blue: '#1d4ed8', green: '#166534', plum: '#7e2265', slate: '#334155' };
export function profileTheme(value: unknown) {
  const theme = profileColors.find(color => color.value === value) ?? profileColors[0];
  return theme.value === 'orange' ? { ...theme, hex: '#f4dfcf' } : theme;
}
/** Only named presets or six-digit hex colours may reach CSS or stored profiles. */
export function isProfileColor(
  value: unknown,
): value is ProfileBusiness['accent'] {
  return (
    typeof value === 'string' &&
    (profileColors.some((color) => color.value === value) || Object.hasOwn(legacyColors, value) ||
      /^#[0-9a-f]{6}$/i.test(value))
  );
}
export function profileColorHex(value: unknown): string {
  return (
    profileColors.find((color) => color.value === value)?.hex ??
    legacyColors[value as keyof typeof legacyColors] ??
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
  accent: (typeof profileColors)[number]['value'] | keyof typeof legacyColors | `#${string}`;
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
