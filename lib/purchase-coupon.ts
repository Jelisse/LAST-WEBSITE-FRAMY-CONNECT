import { normalizeAmbassadorCode } from './ambassador.ts';
export const couponQueryKeys = ['cupao', 'coupon', 'ref'] as const;
export function purchaseCouponFromSearch(search: string) {
  const query = new URLSearchParams(search);
  for (const key of couponQueryKeys) {
    const value = query.get(key);
    if (value?.trim()) {
      try {
        return normalizeAmbassadorCode(value);
      } catch {
        return '';
      }
    }
  }
  return '';
}
export async function validatePurchaseCoupon(
  value: string,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  let code: string;
  try {
    code = normalizeAmbassadorCode(value);
  } catch {
    throw Error('invalid');
  }
  if (!code) throw Error('empty');
  const response = await request(
    '/api/ambassadors?code=' + encodeURIComponent(code),
    { cache: 'no-store', signal },
  );
  if (response.status === 429) throw Error('limit');
  if (!response.ok) throw Error('network');
  const data = (await response.json()) as { valid?: boolean; code?: unknown };
  if (
    data.valid !== true ||
    typeof data.code !== 'string' ||
    !data.code.trim() ||
    data.code.length > 100
  )
    throw Error('invalid');
  return normalizeAmbassadorCode(data.code);
}
