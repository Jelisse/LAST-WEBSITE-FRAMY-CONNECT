import { SiteHeader } from '@/components/site-shell';
import { PaySuiteStatus } from '@/components/paysuite-status';
import { getTranslations } from '@/lib/server-i18n';
export async function generateMetadata() {
  const t = await getTranslations();
  return {
    title: t('Estado do pagamento'),
    robots: { index: false, follow: false },
  };
}
export default function Page() {
  return (
    <>
      <SiteHeader focused />
      <main id="main" className="section-wrap">
        <PaySuiteStatus />
      </main>
    </>
  );
}
