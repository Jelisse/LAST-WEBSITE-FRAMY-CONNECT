import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { Catalog } from '@/components/catalog';
export const metadata = { title: 'Produtos' };
export default function Page() {
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
        <Catalog />
      </main>
      <SiteFooter />
    </>
  );
}
