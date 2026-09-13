export const cardThemes = [
  { id: 'forest', name: 'Verde Connect', from: '#668d25', to: '#00392e' },
  { id: 'violet', name: 'Violeta Digital', from: '#cc0deb', to: '#422075' },
  { id: 'framy', name: 'Framy Signature', from: '#f86a25', to: '#642916' },
  { id: 'plain', name: 'Design próprio', from: '#ffffff', to: '#ffffff' },
  { id: 'ocean', name: 'Ondas Atlântico', from: '#075985', to: '#082f49' },
  { id: 'minimal', name: 'Minimalista', from: '#f5f5f4', to: '#f5f5f4' },
  { id: 'diagonal', name: 'Diagonal Moderna', from: '#18181b', to: '#3f3f46' },
  { id: 'frame', name: 'Moldura Elegante', from: '#241b35', to: '#100d18' },
] as const;
export type CardTheme = (typeof cardThemes)[number]['id'];
export type CardColors = { from: string; to: string; accent: string; text: string };
export function cardPalette(theme: CardTheme = 'plain', colors?: Partial<CardColors>): CardColors {
  const t = cardThemes.find((item) => item.id === theme) ?? cardThemes[3];
  const defaults = { from: t.from, to: t.to, accent: theme === 'frame' ? '#d9b978' : theme === 'diagonal' ? '#fb713b' : theme === 'minimal' ? '#0f766e' : '#ffffff', text: theme === 'plain' || theme === 'minimal' ? '#22312e' : '#ffffff' };
  return Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, /^#[0-9a-f]{6}$/i.test(colors?.[key as keyof CardColors] ?? '') ? colors![key as keyof CardColors] : value])) as CardColors;
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!,
  );
export function cardArtwork({
  theme = 'plain',
  side,
  name = '',
  email = '',
  qr = '',
  art,
  colors,
}: {
  theme?: CardTheme;
  colors?: Partial<CardColors>;
  side: 'front' | 'back';
  name?: string;
  email?: string;
  qr?: string;
  art?: { src: string; scale: number; x: number; y: number };
}) {
  const t = cardThemes.find((t) => t.id === theme) ?? cardThemes[3];
  const plain = t.id === 'plain';
  const palette = cardPalette(theme, colors);
  const fg = palette.text;
  const rgb = [1, 3, 5].map((i) => parseInt(fg.slice(i, i + 2), 16));
  const panel = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 145 ? '#000000' : '#ffffff';
  const label = (
    value: string,
    x: number,
    y: number,
    size: number,
    max: number,
    weight = 400,
  ) =>
    `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fg}" ${value.length * size * 0.56 > max ? `textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ''}>${escape(value)}</text>`;
  const decoration = theme === 'ocean'
    ? `<path d="M0 420Q260 200 510 420T1010 420V638H0Z" fill="${palette.accent}" opacity=".16"/><path d="M0 500Q260 280 510 500T1010 500" fill="none" stroke="${palette.accent}" stroke-width="3" opacity=".5"/>`
    : theme === 'minimal'
      ? `<rect x="58" y="58" width="10" height="522" fill="${palette.accent}"/><path d="M100 560H940" stroke="${palette.accent}" stroke-width="2"/>`
      : theme === 'diagonal'
        ? `<path d="M620 0H1010V638H930L470 0Z" fill="${palette.accent}" opacity=".85"/><path d="M580 0L1010 530" stroke="${palette.text}" stroke-width="3" opacity=".4"/>`
        : theme === 'frame'
          ? `<rect x="32" y="32" width="946" height="574" rx="12" fill="none" stroke="${palette.accent}" stroke-width="4"/><rect x="46" y="46" width="918" height="546" rx="8" fill="none" stroke="${palette.accent}" stroke-width="1"/>`
          : plain ? '' : `<path d="M0 0H330L130 638H0Z" fill="url(#${theme === 'violet' ? 'lines' : 'dots'})"/><path d="M770 0H1010V638H610Z" fill="url(#${theme === 'violet' ? 'lines' : 'dots'})"/>`;
  const background = `<defs><linearGradient id="bg" x2="1" y2=".5"><stop stop-color="${palette.from}"/><stop offset="1" stop-color="${palette.to}"/></linearGradient><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="4" fill="${palette.accent}" opacity=".18"/></pattern><pattern id="lines" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M0 50L25 7H75L100 50L75 93H25Z" fill="none" stroke="${palette.accent}" stroke-opacity=".2" stroke-width="2"/></pattern></defs><rect width="1010" height="638" fill="url(#bg)"/>${decoration}`;
  const artwork = art
    ? `<image href="${escape(art.src)}" x="${505 + art.x * 10.1 - (1010 * art.scale) / 200}" y="${319 + art.y * 6.38 - (638 * art.scale) / 200}" width="${(1010 * art.scale) / 100}" height="${(638 * art.scale) / 100}" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  const front = art
    ? ''
    : `${label('FRAMY', 275, 310, 105, 600, 700)}${label('C O N N E C T', 285, 364, 31, 600)}${label('O seu mundo. Num toque.', 285, 480, 25, 600)}`;
  const identityPanel = !colors && ['plain', 'forest', 'violet', 'framy'].includes(theme)
    ? plain ? '<rect x="0" y="338" width="1010" height="300" fill="white"/>' : '<rect x="44" y="333" width="922" height="261" rx="16" fill="#000000" fill-opacity=".68"/>'
    : `<rect x="44" y="333" width="922" height="261" rx="16" fill="${panel}" fill-opacity=".92"/>`;
  const back = `${identityPanel}${label(name || 'Nome do titular', 76, 410, 38, 560, 700)}${label(email || 'Email do titular', 76, 465, 27, 560)}${label('Aproxime o telemóvel ou leia o QR', 76, 548, 22, 560)}<rect x="708" y="346" width="225" height="225" rx="12" fill="white"/>${qr ? `<image href="${escape(qr)}" x="715" y="353" width="211" height="211"/>` : '<text x="820" y="439" text-anchor="middle" fill="#43564f" font-family="Arial,sans-serif" font-size="24">QR do perfil</text><text x="820" y="475" text-anchor="middle" fill="#43564f" font-family="Arial,sans-serif" font-size="18">após criar o perfil</text>'}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="85.5mm" height="54mm" viewBox="0 0 1010 638">${background}${artwork}${side === 'front' ? front : back}</svg>`;
}
export function cardArtworkUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
