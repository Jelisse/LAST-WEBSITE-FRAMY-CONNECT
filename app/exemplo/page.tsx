import { getTranslations } from '@/lib/server-i18n';
import { MobileProfile } from '@/components/mobile-profile';
import { demoProfile } from '@/lib/demo-profile';
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
      <MobileProfile published measure={false} profile={demoProfile(t)} />
    </main>
  );
}
