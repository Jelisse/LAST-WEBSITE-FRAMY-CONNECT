import { env } from 'cloudflare:workers';
// Defaults closed in every environment. This flag is for integration validation;
// do not enable sales before the replacement gateway and pricing are approved.
export function productCheckoutEnabled() {
  return (
    (env as typeof env & { PRODUCT_CHECKOUT_ENABLED?: string })
      .PRODUCT_CHECKOUT_ENABLED === 'true'
  );
}
