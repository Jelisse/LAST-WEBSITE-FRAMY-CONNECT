export const siteConsentKey = 'framy-analytics-consent';
export const consentChanged = 'framy-consent-changed';
export const consentLifetime = 180 * 86400000;
export function decodeConsent(
  raw: string | null,
  now = Date.now(),
): 'yes' | 'no' | null {
  try {
    const value = JSON.parse(raw || 'null');
    return value?.version === 1 &&
      ['yes', 'no'].includes(value.choice) &&
      Number.isFinite(value.expires) &&
      value.expires > now &&
      value.expires <= now + consentLifetime
      ? value.choice
      : null;
  } catch {
    return null;
  }
}
export function measurementBlocked() {
  return (
    typeof navigator === 'undefined' ||
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}
export function readConsent(key = siteConsentKey) {
  if (measurementBlocked()) return 'no';
  try {
    return decodeConsent(localStorage.getItem(key));
  } catch {
    return null;
  }
}
export function writeConsent(choice: string, key = siteConsentKey) {
  try {
    if (choice === 'yes' || choice === 'no')
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          choice,
          expires: Date.now() + consentLifetime,
        }),
      );
    else localStorage.removeItem(key);
    if (key === siteConsentKey && choice !== 'yes') {
      localStorage.removeItem('framy-analytics-session');
      sessionStorage.removeItem('framy-product-session');
    }
  } catch {
    /* Collection always checks persisted consent and fails closed. */
  }
  window.dispatchEvent(new Event(consentChanged));
  return readConsent(key);
}
