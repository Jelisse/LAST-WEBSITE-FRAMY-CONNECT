export type LeatherDesign = {
  color: 'brown' | 'black';
  logo: 'full' | 'symbol';
  assetId?: string;
  fileName?: string;
  page: number;
  scale: number;
  x: number;
  y: number;
};
export const defaultLeather: LeatherDesign = {
  color: 'brown',
  logo: 'full',
  page: 1,
  scale: 70,
  x: 0,
  y: 0,
};
export function validateLeather(input: unknown, design: string): LeatherDesign {
  if (!input || typeof input !== 'object')
    throw Error('Configure o porta-chaves de couro.');
  const v = input as LeatherDesign;
  if (
    !['brown', 'black'].includes(v.color) ||
    !['full', 'symbol'].includes(v.logo)
  )
    throw Error('Cor ou logótipo inválido.');
  if (
    !Number.isInteger(v.page) ||
    v.page < 1 ||
    v.page > 100 ||
    ![v.scale, v.x, v.y].every(Number.isFinite) ||
    v.scale < 25 ||
    v.scale > 100 ||
    Math.abs(v.x) > 20 ||
    Math.abs(v.y) > 20
  )
    throw Error('Ajuste a posição do logótipo.');
  const result: LeatherDesign = {
    color: v.color,
    logo: v.logo,
    page: v.page,
    scale: v.scale,
    x: v.x,
    y: v.y,
  };
  if (design === 'customer') {
    if (!v.assetId || !/^[a-f0-9-]{36}$/.test(v.assetId))
      throw Error('Carregue o logótipo antes de pagar.');
    result.assetId = v.assetId;
    result.fileName = String(v.fileName ?? 'Logótipo').slice(0, 150);
  }
  return result;
}
