import { getTranslations } from '@/lib/server-i18n';
import { getProducts } from '@/lib/server-catalog';
import { publicPageRobots } from '@/lib/server-site';
import { publicProduct } from '@/lib/catalog';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { Catalog } from '@/components/catalog';
export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('Produtos'), robots: publicPageRobots() };
}
export const dynamic = 'force-dynamic';
export default async function Page() {
  const t = await getTranslations();
  const products = (await getProducts())
    .filter((p) => p.published !== false)
    .map(publicProduct);
  return (
    <>
      <SiteHeader />
      <main id="main" className="catalog-page section-wrap">
        <span className="eyebrow">{t('UM FORMATO PARA CADA CONEXÃO')}</span>
        <h1>
          {t('O seu mundo.')}
          <br />
          <em>{t('À sua maneira.')}</em>
        </h1>
        <p className="page-intro">
          {t(
            'Do cartão que o apresenta ao acessório que o acompanha. Encontre o seu próximo toque.',
          )}
        </p>
        <Catalog products={products} />
      </main>
      <SiteFooter />
    </>
  );
}
