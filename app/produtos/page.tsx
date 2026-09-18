import { getProducts } from '@/lib/server-catalog';
import { publicPageRobots } from '@/lib/server-site';
import { publicProduct } from '@/lib/catalog';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { Catalog } from '@/components/catalog';
export const metadata = { title: 'Produtos', robots: publicPageRobots() };
export const dynamic = 'force-dynamic';
export default async function Page() {
  const products = (await getProducts())
    .filter((p) => p.published !== false)
    .map(publicProduct);
  return (
    <>
      <SiteHeader />
      <main id="main" className="catalog-page section-wrap">
        <span className="eyebrow">UM FORMATO PARA CADA CONEXÃO</span>
        <h1>
          O seu mundo.
          <br />
          <em>À sua maneira.</em>
        </h1>
        <p className="page-intro">
          Do cartão que o apresenta ao acessório que o acompanha. Encontre o seu
          próximo toque.
        </p>
        <Catalog products={products} />
      </main>
      <SiteFooter />
    </>
  );
}
