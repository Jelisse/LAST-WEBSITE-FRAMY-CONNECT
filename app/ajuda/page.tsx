import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-shell';
import { HelpCentre } from '@/components/help-centre';
import { getTranslations } from '@/lib/server-i18n';
import { publicPageRobots } from '@/lib/server-site';
import '../public-marketing.css';
import './style.css';

export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Centro de ajuda'),
    description: t(
      'Guias práticos, acompanhamento de encomendas e apoio por WhatsApp ou email. Encontre ajuda para o seu perfil, produtos NFC e equipa.',
    ),
    robots: publicPageRobots(),
  };
}
export default function HelpPage() {
  return (
    <div className="framy-public phase-one help-page">
      <PublicHeader help />
      <main id="main">
        <HelpCentre />
      </main>
      <SiteFooter />
    </div>
  );
}
