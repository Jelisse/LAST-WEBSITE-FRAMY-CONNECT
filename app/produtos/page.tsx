import '../home-solutions.css';
import { getTranslations } from '@/lib/server-i18n';
import { getProducts } from '@/lib/server-catalog';
import { publicPageRobots } from '@/lib/server-site';
import { env } from 'cloudflare:workers';
import { paysuiteReady } from '@/lib/server-paysuite';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { HomePurchaseOffers } from '@/components/home-purchase-offers';
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('Produtos'), robots: publicPageRobots() };
}
export const dynamic = 'force-dynamic';
export default async function Page() {
  const t = await getTranslations();
  const products = (await getProducts()).filter((p) => p.published !== false);
  const settings = await env.DB.prepare(
    'SELECT enabled FROM checkout_pricing WHERE id=1',
  ).first<{ enabled: number }>();
  const checkoutAvailable = paysuiteReady(env) && settings?.enabled === 1;
  return (
    <>
      <SiteHeader />
      <main id="main" className="catalog-page section-wrap">
        <span className="eyebrow">{t('UM FORMATO PARA CADA CONEXÃO')}</span>
        <h1>{t('Escolha o seu produto NFC')}</h1>
        <p className="page-intro">
          {t(
            'Escolha cartão, porta-chaves ou o kit completo, ligados ao mesmo perfil digital.',
          )}
        </p>
        <HomePurchaseOffers
          products={products}
          checkoutAvailable={checkoutAvailable}
        />
      </main>
      <SiteFooter />
    </>
  );
}
