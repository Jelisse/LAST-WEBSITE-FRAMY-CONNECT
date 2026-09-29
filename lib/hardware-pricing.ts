import type { Product } from './catalog';
import type { PurchaseFormat } from './purchase-structure';

// Only expose pricing fields. Internal costs and unpublished products never reach the client.
export type HardwarePrice = Pick<
  Product,
  'id' | 'amount' | 'version' | 'kitAmount'
>;
export function hardwarePrices(products: Product[]): HardwarePrice[] {
  return products
    .filter(
      (p) =>
        p.published !== false && p.configurationPriceConfirmed && p.amount > 0,
    )
    .map(({ id, amount, version, kitAmount }) => ({
      id,
      amount,
      version,
      kitAmount,
    }));
}
// Informational pricing only. A future checkout must reprice server-side and snapshot the order.
export function hardwareEstimate(
  prices: HardwarePrice[],
  format: PurchaseFormat,
  card: string,
  keychain: string,
) {
  const cardId = (
    { PVC: 'pvc', Madeira: 'wood', Metal: 'metal' } as Record<string, string>
  )[card];
  const keychainId = (
    { 'PVC + epóxi': 'keychain', Couro: 'keychain-leather' } as Record<
      string,
      string
    >
  )[keychain];
  const cardPrice = prices.find((p) => p.id === cardId);
  const keyPrice = prices.find((p) => p.id === keychainId);
  if (format === 'card')
    return cardPrice ? { amount: cardPrice.amount, saving: 0 } : null;
  if (format === 'keychain')
    return keyPrice ? { amount: keyPrice.amount, saving: 0 } : null;
  const baseCard = prices.find((p) => p.id === 'pvc');
  const baseKey = prices.find((p) => p.id === 'keychain');
  if (!cardPrice || !keyPrice || !baseCard?.kitAmount || !baseKey) return null;
  const separate = cardPrice.amount + keyPrice.amount;
  const amount =
    baseCard.kitAmount +
    cardPrice.amount -
    baseCard.amount +
    keyPrice.amount -
    baseKey.amount;
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000)
    return null;
  return { amount, saving: Math.max(0, separate - amount) };
}
