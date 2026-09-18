import { getTranslations } from '@/lib/server-i18n';
import { MobileProfile } from '@/components/mobile-profile';
import { blankProfile } from '@/lib/domain';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Perfil de demonstração'),
    robots: { index: false, follow: false },
  };
}
export default async function ExampleProfile() {
  const t = await getTranslations();
  return (
    <main id="main" className="standalone-mobile-profile">
      <MobileProfile
        published
        profile={{
          ...blankProfile,
          name: 'Firmino Chambale',
          username: 'exemplo',
          title: t('Arquitecto e Planeador Físico'),
          photoUrl: '/home/demo-portrait.jpg',
          photoPosition: 35,
          links: [
            { label: t('Conhecer a Framy'), url: '/' },
            { label: t('Ver produtos'), url: '/produtos' },
            { label: t('Fale connosco'), url: '/contacto' },
          ],
          bio: t('Perfil de demonstração Framy Connect.'),
        }}
      />
    </main>
  );
}
