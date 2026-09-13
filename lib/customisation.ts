export const FREE_PLAN_ID = 'free-30';
export const PAYMENT_URL =
  'https://pay.opsellio.com/checkout/chk_01m1vv12v7sm7g0pmmr5mgdbj2';
export const keychainChoices = [
  { id: 'tiktok', name: 'TikTok', index: 0 },
  { id: 'pattern', name: 'Padrão artístico', index: 1 },
  { id: 'instagram', name: 'Instagram', index: 2 },
] as const;
export type StockOption = {
  id: string;
  label: string;
  quantity: number;
  enabled: number;
  version: number;
};
export type Artwork = {
  placement?: 'logo';
  fileKey: string;
  name: string;
  page: number;
  scale: number;
  x: number;
  y: number;
  assetId?: string;
};
export type ProductDesign = {
  editorVersion?: number;
  cardText?: Partial<Record<'front' | 'back', import('./card-art').CardCopy>>;
  cardColors?: import('./card-art').CardColors;
  cardTheme?: import('./card-art').CardTheme;
  optionId: string;
  front?: Artwork;
  back?: Artwork;
  profileUrl?: string;
  holderName?: string;
  holderEmail?: string;
};
export function resetProductDesign(design: ProductDesign): ProductDesign {
  const defaults = {...design};
  delete defaults.front;
  delete defaults.back;
  delete defaults.cardText;
  delete defaults.cardColors;
  return defaults;
}
export function supportsDesign(product: { id: string; category: string }) {
  return product.id === 'keychain' || product.category === 'Cartões';
}
export function blankOption(product: { id: string }) {
  return product.id === 'keychain' ? 'blank-keychain' : 'blank-card';
}
export function validateDesign(
  input: unknown,
  product: { id: string; category: string },
): ProductDesign | undefined {
  if (!supportsDesign(product)) return undefined;
  if (!input || typeof input !== 'object') throw Error('Escolha um modelo.');
  const d = input as ProductDesign;
  const allowed =
    product.id === 'keychain'
      ? ['tiktok', 'pattern', 'instagram', 'blank-keychain']
      : ['blank-card'];
  if (!allowed.includes(d.optionId)) throw Error('Modelo inválido.');
  const result: ProductDesign = { optionId: d.optionId };
  if (product.category === 'Cartões') {
    if (
      d.cardTheme &&
      !['forest', 'violet', 'framy', 'plain', 'ocean', 'minimal', 'diagonal', 'frame', 'navy-gold', 'black-essential', 'silver-wave', 'blue-rings', 'white-studio', 'blue-connect', 'black-signature', 'gold-hex', 'graphite-vertical', 'architect-vertical', 'violet-vertical'].includes(d.cardTheme)
    )
      throw Error('Estilo de cartão inválido.');
    result.cardTheme = d.cardTheme ?? 'plain';
    if (d.editorVersion === 2) result.editorVersion = 2;
    if (d.cardText !== undefined) {
      if (!d.cardText || typeof d.cardText !== 'object') throw Error('Texto inválido.');
      result.cardText = {};
      for (const side of ['front', 'back'] as const) {
        const copy = d.cardText[side];
        if (copy === undefined) continue;
        if (!copy || typeof copy !== 'object') throw Error('Texto inválido.');
        result.cardText[side] = {};
        for (const key of ['brand','subtitle','name','email','action'] as const) {
          if (copy[key] === undefined) continue;
          if (typeof copy[key] !== 'string' || copy[key]!.length > (key === 'email' ? 120 : 80)) throw Error('Texto demasiado longo.');
          result.cardText[side]![key] = copy[key];
        }
      }
    }
    if (d.cardColors !== undefined) {
      if (!d.cardColors || typeof d.cardColors !== 'object' ||
        !['from', 'to', 'accent', 'text'].every((key) =>
          typeof d.cardColors![key as keyof typeof d.cardColors] === 'string' &&
          /^#[0-9a-f]{6}$/i.test(d.cardColors![key as keyof typeof d.cardColors])))
        throw Error('Use cores HEX válidas, por exemplo #FF6600.');
      result.cardColors = { from: d.cardColors.from, to: d.cardColors.to, accent: d.cardColors.accent, text: d.cardColors.text };
    }
  }
  for (const side of ['front', 'back'] as const) {
    const a = d[side];
    if (!a) continue;
    if (
      !d.optionId.startsWith('blank-') ||
      (side === 'back' && product.id === 'keychain')
    )
      throw Error('Este lado não pode ser personalizado.');
    if (!a.assetId || !/^[0-9a-f-]{36}$/.test(a.assetId))
      throw Error('Carregue o ficheiro de impressão.');
    if (
      !Number.isInteger(a.page) ||
      a.page < 1 ||
      a.page > 100 ||
      ![a.scale, a.x, a.y].every(Number.isFinite) ||
      a.scale < 20 ||
      a.scale > 150 ||
      Math.abs(a.x) > 40 ||
      Math.abs(a.y) > 40
    )
      throw Error('Posição ou página inválida.');
    if (a.placement !== undefined && (a.placement !== 'logo' || product.category !== 'Cartões')) throw Error('Posição de logótipo inválida.');
    result[side] = {
      ...(a.placement === 'logo' ? {placement: 'logo' as const} : {}),
      assetId: a.assetId,
      fileKey: '',
      name: String(a.name).slice(0, 150),
      page: a.page,
      scale: a.scale,
      x: a.x,
      y: a.y,
    };
  }
  if (d.optionId === 'blank-keychain' && !result.front)
    throw Error('Adicione o seu logótipo ou PDF.');
  return result;
}
