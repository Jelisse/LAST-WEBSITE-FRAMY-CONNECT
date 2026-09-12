import Link from '@/components/hard-link';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="section-wrap information-page">
        <span className="eyebrow">404 / LIGAÇÃO INDISPONÍVEL</span>
        <h1>
          Esta ligação ainda
          <br />
          não nos conecta.
        </h1>
        <p>A página não existe ou o perfil não está publicado.</p>
        <Link className="btn btn-primary" href="/">
          Voltar ao início
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
