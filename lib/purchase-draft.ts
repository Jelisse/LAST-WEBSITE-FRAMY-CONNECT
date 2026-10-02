import { pvcModel, type PvcModel } from './pvc-models.ts';
import { validateLeather, type LeatherDesign } from './leather-design.ts';
import { cardMaterials, keychainMaterials } from './purchase-structure.ts';
export function readPurchaseDraft(raw: string | null, now = Date.now()) {
  try {
    const value = JSON.parse(raw || 'null');
    if (
      !value ||
      value.version !== 2 ||
      !Number.isFinite(value.expires) ||
      value.expires <= now ||
      value.expires > now + 1800000
    )
      return null;
    if (
      !cardMaterials.includes(value.card) ||
      !keychainMaterials.includes(value.keychain) ||
      !['standard', 'customer', 'team'].includes(value.design) ||
      !['pickup', 'standard', 'express'].includes(value.delivery)
    )
      return null;
    for (const [field, maximum] of [
      ['city', 60],
      ['pickupPoint', 60],
      ['contact', 50],
      ['address', 300],
      ['designInstructions', 2000],
    ] as const)
      if (typeof value[field] !== 'string' || value[field].length > maximum)
        return null;
    if (value.pvcModel !== undefined)
      value.pvcModel = pvcModel(value.pvcModel).id;
    if (value.leather)
      value.leather = validateLeather(
        value.leather,
        value.leather.assetId ? 'customer' : 'standard',
      );
    return value as {
      leather?: LeatherDesign;
      pvcModel?: PvcModel;
      card: string;
      keychain: string;
      design: string;
      delivery: string;
      city: string;
      pickupPoint: string;
      contact: string;
      address: string;
      designInstructions: string;
    };
  } catch {
    return null;
  }
}
