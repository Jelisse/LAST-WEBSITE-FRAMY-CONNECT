import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-shell';
import { ContactFramy } from '@/components/contact-framy';
import { getTranslations } from '@/lib/server-i18n';
import { publicPageRobots } from '@/lib/server-site';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Contactar a Framy'),
    description: t(
      'Apoio, vendas e parcerias. Fale com a equipa Framy por WhatsApp ou email.',
    ),
    robots: publicPageRobots(),
  };
}
export default function ContactPage() {
  return (
    <div className="framy-public contact-page">
      <PublicHeader />
      <main id="main">
        <ContactFramy />
      </main>
      <SiteFooter />
    </div>
  );
}
