export type DesignReferences = {
  assets: { assetId: string; fileName: string }[];
  url: string;
};
export function validateDesignReferences(
  value: unknown,
  draft = false,
): DesignReferences {
  if (value === undefined || value === null) return { assets: [], url: '' };
  if (typeof value !== 'object' || Array.isArray(value))
    throw Error('Referências inválidas.');
  const input = value as Partial<DesignReferences>;
  if (!Array.isArray(input.assets) || input.assets.length > 3)
    throw Error('Adicione até 3 referências.');
  const assets = input.assets.map((asset) => {
    if (
      !asset ||
      typeof asset.assetId !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(asset.assetId) ||
      typeof asset.fileName !== 'string' ||
      !asset.fileName.trim() ||
      asset.fileName.length > 150
    )
      throw Error('Referências inválidas.');
    return {
      assetId: asset.assetId,
      fileName: Array.from(asset.fileName)
        .filter((character) => character.charCodeAt(0) >= 32)
        .join('')
        .trim(),
    };
  });
  if (new Set(assets.map((asset) => asset.assetId)).size !== assets.length)
    throw Error('Referências inválidas.');
  if (typeof input.url !== 'string' || input.url.length > 1000)
    throw Error('Use um link HTTPS válido para a referência.');
  const url = input.url.trim();
  // Unfinished text is retained only in browser drafts; navigation and checkout use strict validation.
  if (url && !draft) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw Error('Use um link HTTPS válido para a referência.');
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      throw Error('Use um link HTTPS válido para a referência.');
  }
  return { assets, url };
}
