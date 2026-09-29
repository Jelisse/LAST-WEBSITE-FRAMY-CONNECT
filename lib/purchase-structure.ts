// Product configuration is intentionally separate from catalogue stock and prices.
// These choices do not imply availability or create a payable quote.
export const purchaseFormats = [
  {
    id: 'card',
    name: 'Cartão',
    description: 'A sua apresentação profissional.',
  },
  {
    id: 'kit',
    name: 'Kit Completo',
    description: 'Cartão e porta-chaves ligados ao mesmo perfil.',
  },
  {
    id: 'keychain',
    name: 'Porta-chaves',
    description: 'A sua identidade, sempre consigo.',
  },
] as const;
export type PurchaseFormat = (typeof purchaseFormats)[number]['id'];
export const cardMaterials = ['PVC', 'Madeira', 'Metal'] as const;
export const keychainMaterials = ['PVC + epóxi', 'Couro'] as const;
export const designServices = [
  {
    id: 'standard',
    name: 'Design FramyConnect',
    description: 'O design padrão da FramyConnect.',
  },
  {
    id: 'customer',
    name: 'O seu design',
    description: 'Envie um PDF vectorial ou personalize no editor online.',
  },
  {
    id: 'team',
    name: 'Criamos por si',
    description: 'A nossa equipa cria um design para a sua identidade.',
  },
] as const;
export const checkoutMaintenanceMessage =
  'Estamos a actualizar os produtos e o checkout. Novas encomendas e pagamentos estão temporariamente indisponíveis.';
export function purchaseFormat(value: string): PurchaseFormat {
  if (['keychain', 'keychain-leather'].includes(value)) return 'keychain';
  if (['card', 'pvc', 'wood', 'metal'].includes(value)) return 'card';
  return 'kit';
}
export function purchaseSelection(value = 'kit') {
  return {
    format: purchaseFormat(value),
    card: value === 'wood' ? 'Madeira' : value === 'metal' ? 'Metal' : 'PVC',
    keychain: value === 'keychain-leather' ? 'Couro' : 'PVC + epóxi',
  };
}
