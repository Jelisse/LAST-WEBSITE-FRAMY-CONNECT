import { cardMaterials, keychainMaterials } from './purchase-structure.ts';
export function readPurchaseDraft(raw: string | null, now = Date.now()) {
  try {
    const value = JSON.parse(raw || 'null');
    if (
      !value ||
      value.version !== 1 ||
      !Number.isFinite(value.expires) ||
      value.expires <= now ||
      value.expires > now + 1800000
    )
      return null;
    if (
      !cardMaterials.includes(value.card) ||
      !keychainMaterials.includes(value.keychain) ||
      !['standard', 'customer', 'team'].includes(value.design) ||
      !['maputo', 'other'].includes(value.delivery)
    )
      return null;
    for (const [field, maximum] of [
      ['contact', 50],
      ['address', 300],
      ['designInstructions', 2000],
    ] as const)
      if (typeof value[field] !== 'string' || value[field].length > maximum)
        return null;
    return value as {
      card: string;
      keychain: string;
      design: string;
      delivery: string;
      contact: string;
      address: string;
      designInstructions: string;
    };
  } catch {
    return null;
  }
}
