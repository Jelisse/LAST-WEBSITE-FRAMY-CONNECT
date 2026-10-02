import { env } from 'cloudflare:workers';
import { paysuiteReady } from '@/lib/server-paysuite';
import type { CheckoutPricing } from '@/lib/checkout-pricing';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { PurchaseConfigurator } from '@/components/purchase-configurator';
import { getTranslations } from '@/lib/server-i18n';
import { getProducts } from '@/lib/server-catalog';
import { hardwarePrices } from '@/lib/hardware-pricing';
import Link from '@/components/hard-link';
import { purchaseSelection } from '@/lib/purchase-structure';
import { productPhotos } from '@/lib/product-gallery';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { designImageDefaults, type DesignImage } from '@/lib/design-images';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Configurar a sua solução',
  robots: { index: false, follow: false },
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ formato?: string }>;
}) {
  const [t, query, products, user] = await Promise.all([
    getTranslations(),
    searchParams,
    getProducts(),
    getChatGPTUser(),
  ]);
  const pricing = await env.DB.prepare(
    'SELECT * FROM checkout_pricing WHERE id=1',
  )
    .first<CheckoutPricing>()
    .catch(() => null);
  const format = purchaseSelection(query.formato).format;
  const designImages = await env.DB.prepare('SELECT * FROM design_images')
    .all<DesignImage>()
    .then((result) => result.results)
    .catch(() => designImageDefaults);
  const title =
    format === 'keychain'
      ? 'Configurar porta-chaves'
      : format === 'card'
        ? 'Configurar cartão'
        : 'Configurar kit';
  return (
    <>
      <SiteHeader focused />
      <main id="main" className="section-wrap purchase-page">
        <span className="eyebrow">FRAMY CONNECT</span>
        <h1>{t(title)}</h1>
        <p className="page-intro">
          {t(
            format === 'kit'
              ? 'Escolha os materiais do cartão e do porta-chaves e personalize o design do kit.'
              : format === 'keychain'
                ? 'Escolha o material e o design do seu porta-chaves.'
                : 'Escolha o material e o design do seu cartão.',
          )}
        </p>
        <Link className="home-text-link" href="/produtos">
          {t('Escolher outro produto')}
        </Link>
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
      <SiteFooter compact />
    </>
  );
}
