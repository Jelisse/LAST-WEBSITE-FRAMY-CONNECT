const legacyThemes = [
  { id: 'forest', name: 'Verde Connect', from: '#668d25', to: '#00392e' },
  { id: 'violet', name: 'Violeta Digital', from: '#cc0deb', to: '#422075' },
  { id: 'framy', name: 'Framy Signature', from: '#f86a25', to: '#642916' },
  { id: 'plain', name: 'Design próprio', from: '#ffffff', to: '#ffffff' },
  { id: 'ocean', name: 'Ondas Atlântico', from: '#075985', to: '#082f49' },
  { id: 'minimal', name: 'Minimalista', from: '#f5f5f4', to: '#f5f5f4' },
  { id: 'diagonal', name: 'Diagonal Moderna', from: '#18181b', to: '#3f3f46' },
  { id: 'frame', name: 'Moldura Elegante', from: '#241b35', to: '#100d18' },
] as const;
export const cardThemes = [
  {id: 'navy-gold', name: 'Navy & Gold', from: '#203443', to: '#203443', accent: '#bd8c49', text: '#f1e5cf'},
  {id: 'black-essential', name: 'Preto Essencial', from: '#242424', to: '#080808', accent: '#ffffff', text: '#ffffff'},
  {id: 'silver-wave', name: 'Ondas Prata', from: '#242424', to: '#242424', accent: '#bbbbbb', text: '#ffffff'},
  {id: 'blue-rings', name: 'Círculos Cobalto', from: '#243c55', to: '#243c55', accent: '#3478f6', text: '#ffffff'},
  {id: 'white-studio', name: 'Branco Studio', from: '#ffffff', to: '#ffffff', accent: '#247899', text: '#16334d'},
  {id: 'blue-connect', name: 'Azul Connect', from: '#0574d5', to: '#123cb5', accent: '#40c3eb', text: '#ffffff'},
  {id: 'black-signature', name: 'Preto Signature', from: '#101010', to: '#252525', accent: '#aaa69b', text: '#ffffff'},
  {id: 'gold-hex', name: 'Hexágonos Gold', from: '#181818', to: '#262626', accent: '#bc9b42', text: '#e7ce86'},
  {id: 'graphite-vertical', name: 'Grafite Vertical', from: '#303030', to: '#171717', accent: '#d1d1ca', text: '#ffffff'},
  {id: 'architect-vertical', name: 'Arquitecto', from: '#272724', to: '#191917', accent: '#b8a172', text: '#e5d5b5'},
  {id: 'violet-vertical', name: 'Violeta Vertical', from: '#0c0c18', to: '#0c0c18', accent: '#b797e6', text: '#ffffff'},
  {id: 'plain', name: 'Design próprio', from: '#ffffff', to: '#ffffff', accent: '#22312e', text: '#22312e'},
] as const;
export type CardTheme = (typeof cardThemes)[number]['id'] | (typeof legacyThemes)[number]['id'];
export function cardIsPortrait(theme?: CardTheme) { return !!theme?.endsWith('-vertical'); }
export type CardCopy = Partial<Record<'brand' | 'subtitle' | 'name' | 'email' | 'action', string>>;
export function cardCopyFields(theme: CardTheme | undefined, side: 'front' | 'back'): (keyof CardCopy)[] {
  if (side === 'front') return cardIsPortrait(theme) || theme === 'navy-gold' || theme === 'gold-hex' ? ['brand', 'name', 'email'] : theme === 'plain' ? ['brand', 'subtitle', 'action'] : ['brand', 'subtitle'];
  if (cardIsPortrait(theme)) return ['name', 'email'];
  return theme === 'silver-wave' || theme === 'black-signature' ? ['brand','name','email'] : theme === 'plain' ? ['name','email','action'] : ['brand','name','email','action'];
}
export type CardColors = { from: string; to: string; accent: string; text: string };
export function cardPalette(theme: CardTheme = 'plain', colors?: Partial<CardColors>): CardColors {
  const t = cardThemes.find((item) => item.id === theme) ?? legacyThemes.find((item) => item.id === theme) ?? legacyThemes[3];
  const defaults = { from: t.from, to: t.to, accent: 'accent' in t ? t.accent : theme === 'frame' ? '#d9b978' : theme === 'diagonal' ? '#fb713b' : theme === 'minimal' ? '#0f766e' : '#ffffff', text: 'text' in t ? t.text : theme === 'plain' || theme === 'minimal' ? '#22312e' : '#ffffff' };
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
  copy = {},
}: {
  copy?: CardCopy;
  theme?: CardTheme;
  colors?: Partial<CardColors>;
  side: 'front' | 'back';
  name?: string;
  email?: string;
  qr?: string;
  art?: { src: string; scale: number; x: number; y: number };
}) {
  if (theme !== 'plain' && cardThemes.some((t) => t.id === theme)) return referenceArtwork({theme, side, name, email, qr, art, colors, copy});
  const t = legacyThemes.find((t) => t.id === theme) ?? legacyThemes[3];
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
  const front = `${label((art ? '' : copy.brand ?? 'Logo'), 275, 310, 105, 600, 700)}${label(copy.subtitle ?? '', 285, 364, 31, 600)}${label(copy.action ?? '', 285, 480, 25, 600)}`;
  const identityPanel = !colors && ['plain', 'forest', 'violet', 'framy'].includes(theme)
    ? plain ? '<rect x="0" y="338" width="1010" height="300" fill="white"/>' : '<rect x="44" y="333" width="922" height="261" rx="16" fill="#000000" fill-opacity=".68"/>'
    : `<rect x="44" y="333" width="922" height="261" rx="16" fill="${panel}" fill-opacity=".92"/>`;
  const back = `${identityPanel}${label(copy.name ?? (name || 'Nome do titular'), 76, 410, 38, 560, 700)}${label(copy.email ?? (email || 'Email do titular'), 76, 465, 27, 560)}${label(copy.action ?? 'Aproxime ou leia o QR', 76, 548, 22, 560)}<rect x="708" y="346" width="225" height="225" rx="12" fill="white"/>${qr ? `<image href="${escape(qr)}" x="715" y="353" width="211" height="211"/>` : '<text x="820" y="439" text-anchor="middle" fill="#43564f" font-family="Arial,sans-serif" font-size="24">QR do perfil</text><text x="820" y="475" text-anchor="middle" fill="#43564f" font-family="Arial,sans-serif" font-size="18">após criar o perfil</text>'}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="85.5mm" height="54mm" viewBox="0 0 1010 638">${background}${artwork}${side === 'front' ? front : back}</svg>`;
}
export function cardArtworkUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function referenceArtwork({theme, side, name = '', email = '', qr = '', art, colors, copy = {}}: Parameters<typeof cardArtwork>[0]) {
  const p = cardPalette(theme, colors);
  const portrait = cardIsPortrait(theme);
  const w = portrait ? 638 : 1010, h = portrait ? 1010 : 638;
  const gold = theme === 'navy-gold';
  const centered = theme === 'black-signature' || theme === 'silver-wave';
  const text = (value: string, x: number, y: number, size: number, max: number, weight = 400, anchor = 'start') => `<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${p.text}" ${value.length * size * .56 > max ? `textLength="${max}" lengthAdjust="spacingAndGlyphs"` : ''}>${escape(value)}</text>`;
  const nfc = (x: number, y: number) => `<g transform="translate(${x} ${y})" fill="none" stroke="${p.accent}" stroke-width="5" stroke-linecap="round"><path d="M0 12Q14 25 0 38M13 4Q36 25 13 46M26 -4Q58 25 26 54"/></g>`;
  let decor = '';
  if (gold) decor = `<path d="M660 0H1010L795 350L620 638H850L795 350Z" fill="${p.accent}"/><path d="M530 0L795 350L590 220Z" fill="#000" opacity=".14"/>`;
  if (theme === 'silver-wave') decor = Array.from({length: 17}, (_, i) => `<path d="M-80 ${430+i*6}C70 ${220+i*9} 210 ${730-i*8} 330 ${570+i*3}M720 ${-90+i*5}C780 ${180-i*4} 960 ${25+i*12} 1080 ${220+i*3}" fill="none" stroke="${p.accent}" stroke-width="1.2" opacity=".5"/>`).join('');
  if (theme === 'blue-rings') decor = [[25,65,34],[125,38,56],[220,110,38],[70,180,55],[190,225,28],[280,290,67],[20,345,40],[100,400,65],[215,460,37]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="12" opacity=".8"/>`).join('');
  if (theme === 'white-studio') decor = [0,1,2,3,4,5].map(i=>`<circle cx="${60+i*15}" cy="570" r="3" fill="${p.accent}" opacity="${.3+i*.12}"/><circle cx="${870+i*15}" cy="75" r="3" fill="${p.accent}" opacity="${.3+i*.12}"/>`).join('');
  if (theme === 'blue-connect') decor = `<g stroke="${p.accent}" stroke-width="64" stroke-linecap="round" fill="none" opacity=".22"><path d="M600 -30V150Q600 220 680 260T760 390V670M850 -30V120Q850 200 930 250T1010 390"/></g><g fill="${p.accent}" opacity=".2"><circle cx="550" cy="330" r="52"/><circle cx="865" cy="520" r="52"/></g>`;
  if (theme === 'gold-hex') decor = `<defs><pattern id="hex" width="108" height="94" patternUnits="userSpaceOnUse"><path d="M27 2H81L107 47L81 92H27L1 47Z" fill="#000" fill-opacity=".15" stroke="${p.accent}" stroke-opacity=".17" stroke-width="2"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#hex)"/>`;
  if (theme === 'architect-vertical') decor = `<g fill="none" stroke="${p.accent}" stroke-width="2" opacity=".3"><path d="M60 360V180L160 140V360M190 360V100L295 55V360M325 360V190L420 150V360M450 360V130L560 180V360"/>${[85,115,215,245,355,385,480,515].map(x=>`<path d="M${x} 205V325" stroke-dasharray="7 12"/>`).join('')}</g>`;
  if (theme === 'violet-vertical') decor = `<defs><linearGradient id="capsule" x2="1" y2="1"><stop stop-color="${p.accent}"/><stop offset=".3" stop-color="${p.from}"/><stop offset=".8" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.to}"/></linearGradient></defs><g transform="rotate(32 319 300)" fill="url(#capsule)" stroke="${p.accent}" stroke-opacity=".3"><rect x="70" y="-260" width="120" height="600" rx="60"/><rect x="290" y="-70" width="150" height="680" rx="75"/><rect x="535" y="-200" width="90" height="520" rx="45"/></g>`;
  const bg = `<defs><linearGradient id="base" x2="1" y2="1"><stop stop-color="${p.from}"/><stop offset="1" stop-color="${p.to}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#base)"/>${decor}`;
  const userArt = art ? `<image href="${escape(art.src)}" x="${w*(.5+art.x/100-art.scale/200)}" y="${h*(.5+art.y/100-art.scale/200)}" width="${w*art.scale/100}" height="${h*art.scale/100}" preserveAspectRatio="xMidYMid meet"/>` : '';
  const qrSize = portrait ? 210 : 200;
  const qx = portrait ? (w-qrSize)/2 : centered ? 405 : 744;
  const qy = portrait ? 590 : centered ? 155 : 315;
  const qrBlock = `<rect x="${qx}" y="${qy}" width="${qrSize}" height="${qrSize}" rx="4" fill="#fff"/>${qr ? `<image href="${escape(qr)}" x="${qx}" y="${qy}" width="${qrSize}" height="${qrSize}"/>` : `<text x="${qx+qrSize/2}" y="${qy+90}" text-anchor="middle" fill="#333" font-size="22" font-family="Arial,sans-serif">QR do perfil</text><text x="${qx+qrSize/2}" y="${qy+122}" text-anchor="middle" fill="#555" font-size="15" font-family="Arial,sans-serif">após criar o perfil</text>`}`;
  const tx = portrait ? 52 : 65;
  const front = portrait
    ? `${nfc(510,70)}${text((art ? '' : copy.brand ?? 'Logo'),52,theme === 'violet-vertical' ? 700 : 480,30,520,600)}${text(copy.name ?? (name || 'Nome do titular'),52,835,30,530,600)}${text(copy.email ?? (email || 'Email do titular'),52,885,22,530)}`
    : gold || theme === 'gold-hex'
      ? `${nfc(70,65)}${text((art ? '' : copy.brand ?? 'Logo'),65,265,28,590,600)}${text(copy.name ?? (name || 'Nome do titular'),65,390,46,570,600)}${text(copy.email ?? (email || 'Email do titular'),65,452,26,550)}`
      : `${text((art ? '' : copy.brand ?? 'Logo'),505,315,theme === 'black-essential' ? 91 : 66,650,600,'middle')}${text(copy.subtitle ?? '',505,365,23,600,400,'middle')}${nfc(870,520)}`;
  // An opaque identity area keeps uploaded artwork away from the printed contact details.
  const back = portrait
    ? `<rect x="30" y="475" width="578" height="460" fill="${p.to}"/>${text(copy.name ?? (name || 'Nome do titular'),319,525,32,520,600,'middle')}${qrBlock}${text(copy.email ?? (email || 'Email do titular'),319,850,23,520,400,'middle')}${nfc(510,70)}`
    : centered
      ? `<rect x="50" y="115" width="910" height="425" fill="${p.to}"/>${qrBlock}${text(copy.name ?? (name || 'Nome do titular'),505,425,34,810,600,'middle')}${text(copy.email ?? (email || 'Email do titular'),505,480,25,810,400,'middle')}${text((art ? '' : copy.brand ?? 'Logo'),65,75,23,660,600)}${nfc(900,530)}`
      : `<rect x="40" y="295" width="930" height="270" fill="${p.to}"/>${text((art ? '' : copy.brand ?? 'Logo'),tx,100,25,650,600)}${text(copy.name ?? (name || 'Nome do titular'),tx,390,40,625,600)}${text(copy.email ?? (email || 'Email do titular'),tx,447,25,625)}${text(copy.action ?? 'Aproxime ou leia o QR',tx,520,21,625)}${qrBlock}${nfc(890,65)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${portrait ? 54 : 85.5}mm" height="${portrait ? 85.5 : 54}mm" viewBox="0 0 ${w} ${h}">${bg}${userArt}${side === 'front' ? front : back}</svg>`;
}
