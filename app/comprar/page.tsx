import '../purchase-focus.css';
import { env } from 'cloudflare:workers';
import { paysuiteReady } from '@/lib/server-paysuite';
import type { CheckoutPricing } from '@/lib/checkout-pricing';
import { SiteHeader } from '@/components/site-shell';
import { PurchaseConfigurator } from '@/components/purchase-configurator';
import { getTranslations } from '@/lib/server-i18n';
import { getProducts } from '@/lib/server-catalog';
import { hardwarePrices } from '@/lib/hardware-pricing';
import { productPhotos } from '@/lib/product-gallery';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { designImageDefaults, type DesignImage } from '@/lib/design-images';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Configurar a sua solução'),
    robots: { index: false, follow: false },
  };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ formato?: string }>;
}) {
  const [query, products, user] = await Promise.all([
    searchParams,
    getProducts(),
    getChatGPTUser(),
  ]);
  const pricing = await env.DB.prepare(
    'SELECT * FROM checkout_pricing WHERE id=1',
  )
    .first<CheckoutPricing>()
    .catch(() => null);
  const designImages = await env.DB.prepare('SELECT * FROM design_images')
    .all<DesignImage>()
    .then((result) => result.results)
    .catch(() => designImageDefaults);
  return (
    <>
      <SiteHeader focused hideAccount />
      <main id="main" className="section-wrap purchase-page">
        <PurchaseConfigurator
          key={query.formato ?? 'kit'}
          initial={query.formato}
          prices={hardwarePrices(products)}
          photos={productPhotos(products)}
          designImages={designImages}
          leatherDimensions={
            products.find((p) => p.id === 'keychain-leather')?.dimensions
          }
          pricing={pricing}
          paymentAvailable={paysuiteReady(env) && !!pricing?.enabled}
          signedIn={!!user}
        />
      </main>
    </>
  );
}
