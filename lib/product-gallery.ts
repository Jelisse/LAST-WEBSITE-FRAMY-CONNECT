import type { Product } from './catalog';

export type ProductPhoto = {
  id: string;
  material: string;
  src: string;
  detail?: string;
  cardSide?: 'front' | 'back';
};
const materials: Record<string, string> = {
  pvc: 'PVC',
  wood: 'Madeira',
  metal: 'Metal',
  keychain: 'PVC + epóxi',
  'keychain-leather': 'Couro',
};

// Only public photography reaches the browser; never send the complete catalogue.
export function productPhotos(products: Product[]): ProductPhoto[] {
  return products.flatMap((product) => {
    if (product.published === false || !materials[product.id]) return [];
    const src = product.imageUrl;
    // The legacy leather seed uses the epoxy photograph, which is not a leather preview.
    if (
      !src ||
      (product.id === 'keychain-leather' && src === '/products/keychain.png')
    )
      return [];
    return [{ id: product.id, material: materials[product.id], src }];
  });
}
