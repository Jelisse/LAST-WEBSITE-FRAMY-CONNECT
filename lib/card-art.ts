export const cardThemes = [
  { id: 'forest', name: 'Verde Connect', from: '#668d25', to: '#00392e' },
  { id: 'violet', name: 'Violeta Digital', from: '#cc0deb', to: '#422075' },
  { id: 'framy', name: 'Framy Signature', from: '#f86a25', to: '#642916' },
  { id: 'plain', name: 'Design próprio', from: '#ffffff', to: '#ffffff' },
] as const;
export type CardTheme = (typeof cardThemes)[number]['id'];
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
}: {
  theme?: CardTheme;
  side: 'front' | 'back';
  name?: string;
  email?: string;
  qr?: string;
  art?: { src: string; scale: number; x: number; y: number };
}) {
  const t = cardThemes.find((t) => t.id === theme) ?? cardThemes[3];
  const plain = t.id === 'plain';
  const fg = plain ? '#22312e' : '#ffffff';
  const label = (
    value: string,
    x: number,
    y: number,
    size: number,
    max: number,
    weight = 400,
  ) =>
    `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}" fill="${fg}" ${value.length * size * 0.56 > max ? `textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ''}>${escape(value)}</text>`;
  const background = `<defs><linearGradient id="bg" x2="1" y2=".5"><stop stop-color="${t.from}"/><stop offset="1" stop-color="${t.to}"/></linearGradient><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="4" fill="white" opacity=".18"/></pattern><pattern id="lines" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M0 50L25 7H75L100 50L75 93H25Z" fill="none" stroke="white" stroke-opacity=".12" stroke-width="2"/></pattern></defs><rect width="1010" height="638" fill="url(#bg)"/>${plain ? '' : `<path d="M0 0H330L130 638H0Z" fill="url(#${theme === 'violet' ? 'lines' : 'dots'})"/><path d="M770 0H1010V638H610Z" fill="url(#${theme === 'violet' ? 'lines' : 'dots'})"/>`}`;
  const artwork = art
    ? `<image href="${escape(art.src)}" x="${505 + art.x * 10.1 - (1010 * art.scale) / 200}" y="${319 + art.y * 6.38 - (638 * art.scale) / 200}" width="${(1010 * art.scale) / 100}" height="${(638 * art.scale) / 100}" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  const front = art
    ? ''
    : `${label('FRAMY', 275, 310, 105, 600, 700)}${label('C O N N E C T', 285, 364, 31, 600)}${label('O seu mundo. Num toque.', 285, 480, 25, 600)}`;
  const back = `${plain ? '<rect x="0" y="338" width="1010" height="300" fill="white"/>' : '<rect x="44" y="333" width="922" height="261" rx="16" fill="#000000" fill-opacity=".68"/>'}${label(name || 'Nome do titular', 76, 410, 38, 560, 700)}${label(email || 'Email do titular', 76, 465, 27, 560)}${label('Aproxime o telemóvel ou leia o QR', 76, 548, 22, 560)}<rect x="708" y="346" width="225" height="225" rx="12" fill="white"/>${qr ? `<image href="${escape(qr)}" x="715" y="353" width="211" height="211"/>` : '<text x="820" y="439" text-anchor="middle" fill="#43564f" font-family="Arial,sans-serif" font-size="24">QR do perfil</text><text x="820" y="475" text-anchor="middle" fill="#43564f" font-family="Arial,sans-serif" font-size="18">após criar o perfil</text>'}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="85.5mm" height="54mm" viewBox="0 0 1010 638">${background}${artwork}${side === 'front' ? front : back}</svg>`;
}
export function cardArtworkUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
