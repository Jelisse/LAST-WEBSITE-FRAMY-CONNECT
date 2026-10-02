import { readFulfilment, fulfilmentQuote } from './fulfilment.ts';
import { hardwareEstimate, hardwarePrices } from './hardware-pricing.ts';
import type { Product } from './catalog';
export type CheckoutPricing = {
  fulfilment_json?: string;
  customer_design: number;
  team_design: number;
  maputo_delivery: number;
  enabled: number;
  version: number;
};
export function configurationQuote(
  products: Product[],
  settings: CheckoutPricing,
  input: Record<string, unknown>,
) {
  const format = input.format;
  if (!['card', 'keychain', 'kit'].includes(String(format)))
    throw Error('Produto inválido.');
  const card = typeof input.card === 'string' ? input.card : 'PVC',
    keychain =
      typeof input.keychain === 'string' ? input.keychain : 'PVC + epóxi';
  const design = String(input.design);
  if (!['standard', 'customer', 'team'].includes(design))
    throw Error('Design inválido.');
  const ids = [
    ...(format !== 'keychain'
      ? [
          (
            { PVC: 'pvc', Madeira: 'wood', Metal: 'metal' } as Record<
              string,
              string
            >
          )[card],
        ]
      : []),
    ...(format !== 'card'
      ? [
          (
            { 'PVC + epóxi': 'keychain', Couro: 'keychain-leather' } as Record<
              string,
              string
            >
          )[keychain],
        ]
      : []),
  ];
  if (
    ids.some(
      (id) =>
        !id ||
        !products.some(
          (p) =>
            p.id === id &&
            p.available &&
            p.published !== false &&
            p.configurationPriceConfirmed,
        ),
    )
  )
    throw Error('Material indisponível.');
  const hardware = hardwareEstimate(
    hardwarePrices(products),
    format as 'card' | 'keychain' | 'kit',
    card,
    keychain,
  );
  if (!hardware) throw Error('Preço por confirmar.');
  const fulfilment = fulfilmentQuote(
    readFulfilment(settings.fulfilment_json),
    input,
  );
  const customization =
    design === 'standard'
      ? 0
      : design === 'customer'
        ? settings.customer_design
        : settings.team_design;
  const delivery = fulfilment.fee;
  const total = hardware.amount + customization + delivery;
  if (
    ![total, customization, delivery].every(Number.isSafeInteger) ||
    total <= 0 ||
    customization < 0 ||
    delivery < 0
  )
    throw Error('Preço inválido.');
  return {
    fulfilment,
    format,
    card,
    keychain,
    design,
    hardware: hardware.amount,
    customization,
    delivery,
    total,
    ids,
    priceIds:
      format === 'kit' ? [...new Set([...ids, 'pvc', 'keychain'])] : ids,
    pricingVersion: settings.version,
  };
}
