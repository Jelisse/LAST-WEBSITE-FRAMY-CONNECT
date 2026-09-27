export type ProfileBusiness = {
  whatsapp: string;
  message: string;
  address: string;
  hours: string;
  accent: 'orange' | 'blue' | 'green' | 'plum' | 'slate';
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
    !['orange', 'blue', 'green', 'plum', 'slate'].includes(accent) ||
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
