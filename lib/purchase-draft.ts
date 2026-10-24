import {
  validateDesignReferences,
  type DesignReferences,
} from './design-references.ts';
import {
  purchaseStageKeys,
  type PurchaseEditorStep,
} from './purchase-journey.ts';
import { pvcModel, type PvcModel } from './pvc-models.ts';
import { validateLeather, type LeatherDesign } from './leather-design.ts';
import { cardMaterials, keychainMaterials } from './purchase-structure.ts';
export function readPurchaseDraft(raw: string | null, now = Date.now()) {
  try {
    const value = JSON.parse(raw || 'null');
    if (
      !value ||
      ![2, 3].includes(value.version) ||
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
    if (
      value.step !== undefined &&
      (!purchaseStageKeys.includes(value.step) || value.step === 'review')
    )
      return null;
    if (
      value.format !== undefined &&
      !['card', 'keychain', 'kit'].includes(value.format)
    )
      return null;
    if (
      value.stage !== undefined &&
      (!Number.isInteger(value.stage) || value.stage < 0 || value.stage > 3)
    )
      return null;
    for (const [field, maximum] of [
      ['locality', 100],
      ['landmark', 70],
      ['buyerName', 100],
      ['buyerEmail', 254],
    ] as const)
      if (
        value[field] !== undefined &&
        (typeof value[field] !== 'string' || value[field].length > maximum)
      )
        return null;
    if (
      value.ambassadorCode !== undefined &&
      (typeof value.ambassadorCode !== 'string' ||
        value.ambassadorCode.length > 100)
    )
      return null;
    if (
      value.kitVariant !== undefined &&
      !['black', 'orange'].includes(value.kitVariant)
    )
      return null;
    value.designReferences = validateDesignReferences(
      value.designReferences,
      true,
    );
    if (value.pvcModel !== undefined)
      value.pvcModel = pvcModel(value.pvcModel).id;
    for (const field of ['cardArtwork', 'pvcArtwork'])
      if (value[field])
        value[field] = validateLeather(
          value[field],
          value[field].assetId ? 'customer' : 'standard',
        );
    if (value.leather)
      value.leather = validateLeather(
        value.leather,
        value.leather.assetId ? 'customer' : 'standard',
      );
    return value as {
      kitVariant?: 'black' | 'orange';
      step?: PurchaseEditorStep;
      designReferences?: DesignReferences;
      locality?: string;
      landmark?: string;
      format?: 'card' | 'keychain' | 'kit';
      stage?: number;
      buyerName?: string;
      buyerEmail?: string;
      ambassadorCode?: string;
      leather?: LeatherDesign;
      cardArtwork?: LeatherDesign;
      pvcArtwork?: LeatherDesign;
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
