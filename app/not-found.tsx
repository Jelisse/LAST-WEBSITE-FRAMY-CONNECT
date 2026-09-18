import { getTranslations } from '@/lib/server-i18n';
import Link from '@/components/hard-link';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
export default async function NotFound() {
  const t = await getTranslations();
  return (
    <>
      <SiteHeader />
      <main id="main" className="section-wrap information-page">
        <span className="eyebrow">{t('404 / LIGAÇÃO INDISPONÍVEL')}</span>
        <h1>
          {t('Esta ligação ainda')}
          <br />
          {t('não nos conecta.')}
        </h1>
        <p>{t('A página não existe ou o perfil não está publicado.')}</p>
        <Link className="btn btn-primary" href="/">
          {t('Voltar ao início')}
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
